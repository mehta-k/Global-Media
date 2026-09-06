// PM2 production config - keep server alive after closing terminal
// Install: npm i -g pm2
// Run: pm2 start ecosystem.config.js --env production
// Save: pm2 save && pm2 startup
export default {
  apps: [{
    name: "global-media",
    script: "./server/server.js",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    watch: false,
    max_memory_restart: "500M",
    error_file: "./server/logs/err.log",
    out_file: "./server/logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm Z"
  }]
};
