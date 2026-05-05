module.exports = {
    apps: [
      {
        name: 'aspace-live-metrics-dashboard',
        script: '/home/ec2-user/.bun/bin/bun',
        args: 'run start',
        env_file: '.env',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true,
        autorestart: true
      },
    ],
}