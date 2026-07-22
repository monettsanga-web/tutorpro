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
    // Call Supabase Edge Function to get temporary STS credentials
    const response = await fetch(`${this.supabaseUrl}/functions/v1/get-cos-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.supabaseToken}`,
      },
      body: JSON.stringify({ bookingId: this.bookingId }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch temporary upload credentials');
    }

    const data = await response.json();

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
    return { cos, bucket: data.bucket, region: data.region, prefix: data.prefix };
  }

  /**
   * Resumable multipart upload with progress, pause, and cancel
   */
  async uploadFile({ file, onProgress, onTaskCreated }) {
    const { cos, bucket, region, prefix } = await this.getCosClient();
    const key = `${prefix}${Date.now()}-${file.name}`;

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
