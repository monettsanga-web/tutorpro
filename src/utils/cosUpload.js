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

    // Read local tutorpro active session details
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

    // Call Supabase Edge Function to get temporary STS credentials
    const { data, error } = await supabase.functions.invoke('get-cos-credentials', {
      body: { 
        bookingId: this.bookingId,
        classroomToken: this.supabaseToken,
        userId: sessionUserId
      },
    });

    if (error || !data) {
      throw new Error(`Failed to fetch temporary credentials: ${error?.message || 'Access Denied'}`);
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
