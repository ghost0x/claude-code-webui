module.exports = {
  apps: [
    {
      name: "claude-code-webui",
      script: "./start.sh",
      cwd: "./backend",
      interpreter: "/bin/bash",
      interpreter_args: "-l",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      // Restart settings
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: "10s",
      // Logging
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
    },
  ],
};
