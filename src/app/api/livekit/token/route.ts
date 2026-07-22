import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  try {
    const { roomName, identity, participantName, isTeacher } = await req.json();

    if (!roomName || !identity) {
      return NextResponse.json(
        { error: "roomName and identity are required parameters" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit Server configuration is missing on host" },
        { status: 500 }
      );
    }

    // Initialize the AccessToken
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: participantName || identity,
    });

    // Configure role-based permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      // If the user is the teacher, they get full admin/control permissions
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isTeacher ? true : false,
      // Screen sharing permissions (teachers have it natively; students require permission)
      canPublishSources: isTeacher ? ["camera", "microphone", "screen_share"] : ["camera", "microphone"],
    });

    // Generate JWT token
    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to generate video session token" },
      { status: 500 }
    );
  }
}
