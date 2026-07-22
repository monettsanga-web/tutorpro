import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      throw new Error("bookingId is required");
    }

    // Verify booking permissions
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("id, teacher_id, student_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found or inaccessible");
    }

    const isTeacher = booking.teacher_id === user.id;
    const isStudent = booking.student_id === user.id;

    if (!isTeacher && !isStudent) {
      throw new Error("You do not have permission to access this booking's classroom");
    }

    const secretId = Deno.env.get("TENCENT_COS_SECRET_ID");
    const secretKey = Deno.env.get("TENCENT_COS_SECRET_KEY");
    const bucket = Deno.env.get("TENCENT_COS_BUCKET");
    const region = Deno.env.get("TENCENT_COS_REGION");
    const appId = Deno.env.get("TENCENT_COS_APP_ID");

    if (!secretId || !secretKey || !bucket || !region) {
      throw new Error("Tencent COS configuration missing on server");
    }

    // Scopes:
    // 1. Booking-specific private folder
    const privateScope = `qcs::cos:${region}:uid/${appId}:${bucket}/classrooms/${bookingId}/*`;
    // 2. Globally shared folder accessible by all teachers (Write/Read for Teachers, Read-only for Students)
    const sharedScope = `qcs::cos:${region}:uid/${appId}:${bucket}/shared/*`;

    const policy = {
      version: "2.0",
      statement: [
        // Statement 1: Private Booking Folder (Full read/write)
        {
          effect: "allow",
          action: [
            "name/cos:PutObject",
            "name/cos:PostObject",
            "name/cos:InitiateMultipartUpload",
            "name/cos:ListMultipartUploads",
            "name/cos:ListParts",
            "name/cos:UploadPart",
            "name/cos:CompleteMultipartUpload",
            "name/cos:AbortMultipartUpload",
            "name/cos:GetObject",
            "name/cos:DeleteObject",
            "name/cos:HeadObject"
          ],
          resource: [privateScope],
        },
        // Statement 2: Shared Folder (Full read/write for Teachers, Read-only for Students)
        {
          effect: "allow",
          action: isTeacher ? [
            "name/cos:PutObject",
            "name/cos:PostObject",
            "name/cos:InitiateMultipartUpload",
            "name/cos:ListMultipartUploads",
            "name/cos:ListParts",
            "name/cos:UploadPart",
            "name/cos:CompleteMultipartUpload",
            "name/cos:AbortMultipartUpload",
            "name/cos:GetObject",
            "name/cos:DeleteObject",
            "name/cos:HeadObject"
          ] : [
            "name/cos:GetObject",
            "name/cos:HeadObject"
          ],
          resource: [sharedScope],
        }
      ],
    };

    const stsCredentials = await getTencentSTS({
      secretId,
      secretKey,
      region,
      policy,
      bookingId,
    });

    return new Response(
      JSON.stringify({
        credentials: stsCredentials,
        bucket,
        region,
        prefix: `classrooms/${bookingId}/`,
        sharedPrefix: `shared/`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

async function getTencentSTS({
  secretId,
  secretKey,
  region,
  policy,
  bookingId,
}: {
  secretId: string;
  secretKey: string;
  region: string;
  policy: any;
  bookingId: string;
}) {
  const endpoint = "sts.tencentcloudapi.com";
  const action = "GetFederationToken";
  const version = "2018-08-13";

  const params: Record<string, any> = {
    Name: `tutorpro-classroom-${bookingId}`,
    Policy: JSON.stringify(policy),
    DurationSeconds: 1800,
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split("T")[0];
  const service = "sts";
  
  const hashedPayload = await sha256Hex("");
  const canonicalRequest = `POST\n/\n\nhost:${endpoint}\n\nhost\n${hashedPayload}`;

  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = await sha256Hex(canonicalRequest);
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  const secretDate = await hmacSha256(date, `TC3${secretKey}`);
  const secretService = await hmacSha256(service, secretDate);
  const secretSigning = await hmacSha256("tc3_request", secretService);
  const signature = await hmacSha256Hex(stringToSign, secretSigning);

  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=host, Signature=${signature}`;

  const response = await fetch(`https://${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Type": "application/json; charset=utf-8",
      "Host": endpoint,
      "X-TC-Action": action,
      "X-TC-Version": version,
      "X-TC-Timestamp": timestamp.toString(),
      "X-TC-Region": region,
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (data.Response.Error) {
    throw new Error(`Tencent STS error: ${data.Response.Error.Message}`);
  }

  return {
    tmpSecretId: data.Response.Credentials.TmpSecretId,
    tmpSecretKey: data.Response.Credentials.TmpSecretKey,
    sessionToken: data.Response.Credentials.Token,
    startTime: data.Response.StartTime,
    expiredTime: data.Response.ExpiredTime,
  };
}

async function sha256Hex(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(message: string, key: string | Uint8Array): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyData = typeof key === "string" ? enc.encode(key) : key;
  const msgData = enc.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return new Uint8Array(sigBuffer);
}

async function hmacSha256Hex(message: string, key: Uint8Array): Promise<string> {
  const sig = await hmacSha256(message, key);
  return Array.from(sig)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
