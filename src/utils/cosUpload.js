import COS from 'cos-js-sdk-v5';

export class TutorProCosUploader {
  constructor(bookingId, supabaseToken, supabaseUrl) {
    this.bookingId = bookingId;
    this.supabaseToken = supabaseToken;
    this.supabaseUrl = supabaseUrl;
    this.cosInstance = null;
    this.uploadTask = null;
  }

  // Initialize COS client with STS temporary credentials
  async getCosClient() {
    const { supabase } = await import('../supabaseClient.js');
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    let sessionUserId = '';
    try {
      const storedSession = sessionStorage.getItem('tutorpro_session_v2') || localStorage.getItem('tutorpro_session_v2');
      if (storedSession) {
        const sessionObj = JSON.parse(storedSession);
        sessionUserId = sessionObj?.id || '';
      }
    } catch (e) {
      console.warn("Could not read local session details:", e);
    }

    let data = null;
    let errorObj = null;

    // Try 1: Invoke via Supabase SDK
    try {
      const result = await supabase.functions.invoke('get-cos-credentials', {
        body: { 
          bookingId: this.bookingId,
          classroomToken: this.supabaseToken,
          userId: sessionUserId
        },
      });
      data = result.data;
      errorObj = result.error;
    } catch (e) {
      console.warn("Supabase invoke failed, attempting direct fetch fallback...", e);
    }

    // Try 2: Direct Fetch Fallback
    if (!data) {
      try {
        const response = await fetch(`https://losmkvvwzijipqrlelyt.supabase.co/functions/v1/get-cos-credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId: this.bookingId,
            classroomToken: this.supabaseToken,
            userId: sessionUserId
          })
        });
        if (response.ok) {
          data = await response.json();
          errorObj = null;
        } else {
          const errText = await response.text();
          let parsedError = 'Direct fetch failed';
          try {
            const parsed = JSON.parse(errText);
            parsedError = parsed.error || parsedError;
          } catch {
            parsedError = errText || parsedError;
          }
          errorObj = { message: parsedError };
        }
      } catch (e) {
        errorObj = { message: e.message || 'Network fetch failed' };
      }
    }

    if (errorObj || !data) {
      throw new Error(`Failed to fetch credentials: ${errorObj?.message || 'Access Denied'}`);
    }

    const cos = new COS({
      getAuthorization: (options, callback) => {
        callback({
          TmpSecretId: data.credentials.tmpSecretId,
          TmpSecretKey: data.credentials.tmpSecretKey,
          SecurityToken: data.credentials.sessionToken,
          StartTime: data.credentials.startTime,
          ExpiredTime: data.credentials.expiredTime,
        });
      },
    });

    this.cosInstance = cos;
    return { 
      cos, 
      bucket: data.bucket, 
      region: data.region, 
      prefix: data.prefix,
      sharedPrefix: data.sharedPrefix || 'shared/'
    };
  }

  /**
   * Generates a temporary, signed read URL for a private COS file
   */
  async getSignedUrl(key) {
    const { cos, bucket, region } = await this.getCosClient();
    return new Promise((resolve, reject) => {
      cos.getObjectUrl({
        Bucket: bucket,
        Region: region,
        Key: key,
        Sign: true, // Signs URL with STS keys
        Expires: 1800 // 30 minutes
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Url);
        }
      });
    });
  }

  /**
   * List files directly from the Tencent COS Bucket under private or shared prefix
   */
  async listBucketFiles(isShared = false) {
    const { cos, bucket, region, prefix, sharedPrefix } = await this.getCosClient();
    const targetPrefix = isShared ? sharedPrefix : prefix;

    return new Promise((resolve, reject) => {
      cos.getBucket({
        Bucket: bucket,
        Region: region,
        Prefix: targetPrefix,
      }, (err, data) => {
        if (err) {
          reject(err);
        } else {
          const contents = data.Contents || [];
          const files = contents
            .filter(item => item.Key !== targetPrefix) // skip folder placeholder
            .map(item => {
              const fullKey = item.Key;
              const rawName = fullKey.substring(fullKey.lastIndexOf('/') + 1);
              const cleanName = rawName.replace(/^\d+-/, ''); // clean timestamp prefix
              
              return {
                id: fullKey,
                name: cleanName,
                key: fullKey,
                size: Number(item.Size),
                type: cleanName.split('.').pop()?.toLowerCase() || 'other',
                status: 'ready',
                url: `https://${bucket}.cos.${region}.myqcloud.com/${fullKey}`
              };
            });
          resolve(files);
        }
      });
    });
  }

  /**
   * Resumable multipart upload with progress, pause, and cancel
   */
  async uploadFile({ file, onProgress, onTaskCreated, isShared = false }) {
    const { cos, bucket, region, prefix, sharedPrefix } = await this.getCosClient();
    
    // Choose destination path based on shared/private setting
    const targetPrefix = isShared ? sharedPrefix : prefix;
    const key = `${targetPrefix}${Date.now()}-${file.name}`;

    return new Promise((resolve, reject) => {
      cos.uploadFile({
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: file,
        SliceSize: 1024 * 1024 * 5, // 5MB slices
        onTaskReady: (taskId) => {
          this.uploadTask = taskId;
          
          onTaskCreated({
            pause: () => {
              cos.pauseTask(taskId);
              onProgress(NaN, 'paused');
            },
            resume: () => {
              cos.restartTask(taskId);
              onProgress(NaN, 'uploading');
            },
            cancel: () => {
              cos.cancelTask(taskId);
              reject(new Error('Upload cancelled by user'));
            }
          });
        },
        onProgress: (progressData) => {
          const progress = Math.round(progressData.percent * 100);
          onProgress(progress, 'uploading');
        }
      }, (err, data) => {
        if (err) {
          onProgress(0, 'error');
          reject(err);
        } else {
          onProgress(100, 'success');
          const fileUrl = `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
          resolve({ url: fileUrl, key });
        }
      });
    });
  }
}
