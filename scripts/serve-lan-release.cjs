// Serve a fixed production build through Node's existing LAN firewall permission.
// The Worker runtime and debugger remain loopback-only.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const args = process.argv.slice(2);
const release = path.resolve(args[0]);
const port = Number(args[1] || 3011);
const workerPort = Number(args[2] || 13011);
const version = JSON.parse(fs.readFileSync(path.join(release, 'client/lan-version.json'), 'utf8').replace(/^\uFEFF/, ''));
const runtime = path.resolve(__dirname, '../node_modules/wrangler/bin/wrangler.js');
const worker = spawn(process.execPath, [runtime, 'dev', '--config', path.join(release, 'server/wrangler.json'), '--local', '--ip', '127.0.0.1', '--port', String(workerPort), '--inspector-ip', '127.0.0.1', '--inspector-port', '9231', '--no-show-interactive-dev-session'], {
  cwd: release, windowsHide: true, stdio: ['ignore', 'inherit', 'inherit'],
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_WRITE_LOGS: 'false' },
});
const server = http.createServer((req, res) => {
  const upstream = http.request({ hostname: '127.0.0.1', port: workerPort, method: req.method, path: req.url, headers: req.headers }, response => {
    res.writeHead(response.statusCode, response.headers);
    response.pipe(res);
  });
  upstream.on('error', error => {
    console.error('Upstream:', error.message);
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Game server unavailable. Please retry shortly.');
  });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
  req.pipe(upstream);
});
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  server.close();
  if (worker.pid) {
    if (process.platform === 'win32') spawn('taskkill', ['/PID', String(worker.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else worker.kill();
  }
  setTimeout(() => process.exit(code), 500).unref();
}
process.on('SIGTERM', () => stop(0));
process.on('SIGINT', () => stop(0));
worker.on('exit', code => { console.error('Worker exited:', code); stop(code || 1); });
worker.on('error', error => { console.error(error); stop(1); });
server.on('error', error => { console.error(error); stop(1); });
(async () => {
  for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${workerPort}/lan-version.json`, { signal: AbortSignal.timeout(1000) });
      const ready = await response.json();
      if (ready.version === version.version) {
        server.listen(port, '0.0.0.0', () => console.log(`LAN ready: ${version.version} on port ${port}`));
        return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!stopping) { console.error('Worker startup timeout'); stop(1); }
})().catch(error => { console.error(error); stop(1); });
