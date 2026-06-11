/**
 * PM2 config for Windows/Linux production.
 *
 * Usage (from vendor-portal folder):
 *   npm run build
 *   pm2 start ecosystem.config.cjs
 *
 * Do NOT use: pm2 start npm -- start
 * That breaks on Windows when the path contains spaces.
 */
const path = require('path');

const appDir = __dirname;
const nextBin = path.join(appDir, 'node_modules', 'next', 'dist', 'bin', 'next');

module.exports = {
  apps: [
    {
      name: 'nextjs-vendor-app',
      cwd: appDir,
      script: nextBin,
      args: 'start -p 3003',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3003',
      },
    },
  ],
};
