/**
 * Auto Port Script
 *
 * Automatically finds an available port starting from 3000
 * Usage: npm run dev (or just run the script)
 */

const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

const START_PORT = 3000;
const MAX_PORT = 3010;

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port);
  });
}

async function findAvailablePort() {
  for (let port = START_PORT; port <= MAX_PORT; port++) {
    const isAvailable = await checkPort(port);
    if (isAvailable) {
      return port;
    }
    console.log(`Port ${port} is in use, trying ${port + 1}...`);
  }
  throw new Error(`No available port found between ${START_PORT} and ${MAX_PORT}`);
}

async function main() {
  const port = await findAvailablePort();

  console.log(`\n🚀 Starting dev server on port ${port}\n`);

  // Use next directly with cross-spawn or child_process.spawn
  const isWindows = process.platform === 'win32';
  const nextCmd = isWindows ? 'npx.cmd' : 'npx';

  const child = spawn(nextCmd, ['next', 'dev', '-p', port.toString()], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env },
    shell: true,
    windowsHide: true,
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

main().catch(console.error);
