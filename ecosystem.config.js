module.exports = {
  apps: [
    {
      name: 'api',
      script: 'apps/api/server.js',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
      },
    },
    {
      name: 'worker-rest',
      script: 'apps/worker/index.js',
      instances: Number(process.env.WORKER_REST_INSTANCES || 5),
      exec_mode: 'fork',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        QUEUE_NAME: 'flickr_rest',
      },
    },
    {
      name: 'worker-upload',
      script: 'apps/worker/index.js',
      instances: Number(process.env.WORKER_UPLOAD_INSTANCES || 5),
      exec_mode: 'fork',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        QUEUE_NAME: 'flickr_upload',
      },
    },
    {
      name: 'worker-replace',
      script: 'apps/worker/index.js',
      instances: Number(process.env.WORKER_REPLACE_INSTANCES || 5),
      exec_mode: 'fork',
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        QUEUE_NAME: 'flickr_replace',
      },
    },
  ],
};
