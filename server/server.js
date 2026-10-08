/* ProjectMatic local server: keeps Langflow credentials out of browser code. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !match[1].startsWith('#') && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const legacyMcpUrl = (process.env.LANGFLOW_FLOW_ID || '').includes('/mcp/');
const config = {
  port: Number(process.env.PORT || 5500),
  langflowUrl: (process.env.LANGFLOW_URL || 'http://localhost:7860').replace(/\/$/, ''),
  flowId: process.env.LANGFLOW_FLOW_ID || '',
  apiKey: process.env.LANGFLOW_API_KEY || '',
  mcpUrl: process.env.LANGFLOW_MCP_URL || (legacyMcpUrl ? process.env.LANGFLOW_FLOW_ID || '' : ''),
  mcpApiKey: process.env.LANGFLOW_MCP_API_KEY || (legacyMcpUrl ? process.env.LANGFLOW_API_KEY || '' : ''),
  mcpTool: process.env.LANGFLOW_MCP_TOOL || '',
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function getFlowMessage(body) {
  const candidates = [
    body?.outputs?.[0]?.outputs?.[0]?.results?.message?.text,
    body?.outputs?.[0]?.outputs?.[0]?.results?.message?.message,
    body?.outputs?.[0]?.outputs?.[0]?.results?.message?.data?.text,
    body?.output?.text,
  ];
  return candidates.find(value => typeof value === 'string' && value.trim())?.trim() || '';
}

function getMcpMessage(body) {
  if (body?.error?.message) throw new Error(body.error.message);
  if (body?.result?.isError) throw new Error(body.result.content?.map(item => item.text).filter(Boolean).join('\n') || 'MCP tool mengembalikan error.');
  const content = body?.result?.content;
  if (Array.isArray(content)) {
    // Langflow may return an intermediate display block plus a final Chat Output block.
    // The final text block is the complete proposal and avoids rendering it twice.
    const text = content.map(item => item?.text).filter(Boolean).at(-1)?.trim() || '';
    if (text) return text;
  }
  if (body?.result?.structuredContent) return JSON.stringify(body.result.structuredContent, null, 2);
  return '';
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error('Request terlalu besar.');
  }
  return JSON.parse(raw || '{}');
}

function buildPrompt(input) {
  return [
    input.brief.trim(),
    input.clientName ? `\nClient: ${input.clientName.trim()}` : '',
    input.template ? `\nPreferred template: ${input.template.trim()}` : '',
  ].join('');
}

function parseMcpPayload(raw) {
  const text = raw.trim();
  if (!text) return {};
  if (text.startsWith(':') || text.startsWith('event:') || text.startsWith('data:') || text.includes('\ndata:')) {
    const data = text.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).pop();
    if (!data) throw new Error('MCP mengirim keep-alive tetapi tidak mengirim respons JSON. Coba ulangi atau periksa Langflow MCP Server.');
    return JSON.parse(data);
  }
  return JSON.parse(text);
}

async function mcpPost(payload, sessionId) {
  const headers = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
    'x-api-key': config.mcpApiKey,
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const response = await fetch(config.mcpUrl, {
    method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  const body = parseMcpPayload(raw);
  if (!response.ok) throw new Error(body?.error?.message || body?.detail || `MCP server mengembalikan HTTP ${response.status}.`);
  return { body, sessionId: response.headers.get('mcp-session-id') || sessionId };
}

function toolArguments(tool, prompt) {
  const properties = tool.inputSchema?.properties || {};
  const preferred = ['input_value', 'input', 'message', 'brief', 'query', 'text'];
  const key = preferred.find(name => properties[name]) || Object.keys(properties).find(name => properties[name]?.type === 'string');
  if (!key) throw new Error(`Tool MCP “${tool.name}” tidak memiliki input teks yang bisa dipakai. Atur LANGFLOW_MCP_TOOL atau periksa schema tool.`);
  return { [key]: prompt };
}

async function runMcp(prompt, sessionId) {
  let session;
  ({ sessionId: session } = await mcpPost({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'projectmatic-web', version: '1.0.0' } },
  }));
  await mcpPost({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, session);
  const toolsResponse = await mcpPost({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, session);
  const tools = toolsResponse.body?.result?.tools || [];
  if (!tools.length) {
    throw new Error('MCP project terhubung tetapi tidak memiliki tool Flow. Di Langflow, pulihkan/buat Flow dengan Chat Output lalu aktifkan pada MCP Server → Edit Tools.');
  }
  const requestedTool = config.mcpTool.trim();
  const tool = requestedTool ? tools.find(item => item.name === requestedTool) : (tools.length === 1 ? tools[0] : tools.find(item => /proposal|projectmatic|generate|draft/i.test(item.name)));
  if (!tool) throw new Error(`MCP menyediakan ${tools.length} tool. Isi LANGFLOW_MCP_TOOL dengan nama tool proposal yang tampil pada tab MCP Server → Tools.`);
  const call = await mcpPost({
    jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: tool.name, arguments: toolArguments(tool, prompt) },
  }, session);
  const output = getMcpMessage(call.body);
  if (!output) throw new Error('Tool MCP selesai tetapi tidak mengembalikan teks. Pastikan Flow memiliki Chat Output.');
  return { output, toolName: tool.name, sessionId: session || sessionId };
}

async function runFlow(prompt, sessionId) {
  if (!config.flowId || config.flowId.includes('://') || !config.apiKey) {
    throw new Error('Flow Run API belum valid. Isi LANGFLOW_FLOW_ID hanya dengan UUID Flow, atau gunakan LANGFLOW_MCP_URL untuk mode MCP.');
  }
  const response = await fetch(`${config.langflowUrl}/api/v1/run/${encodeURIComponent(config.flowId)}?stream=false`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': config.apiKey },
    body: JSON.stringify({ input_value: prompt, input_type: 'chat', output_type: 'chat', session_id: sessionId }), signal: AbortSignal.timeout(120_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || `Langflow mengembalikan HTTP ${response.status}.`);
  const output = getFlowMessage(body);
  if (!output) throw new Error('Langflow selesai tetapi Chat Output tidak ditemukan. Pastikan Flow memiliki Chat Output.');
  return { output, sessionId: body.session_id || sessionId };
}

function activeMode() {
  if (config.mcpUrl && config.mcpApiKey) return 'mcp';
  if (config.flowId && config.apiKey && !config.flowId.includes('://')) return 'flow';
  return 'unconfigured';
}

async function runLangflow(request, response) {
  let input;
  try { input = await readJson(request); } catch (error) { sendJson(response, 400, { error: error.message }); return; }
  if (typeof input.brief !== 'string' || !input.brief.trim()) { sendJson(response, 400, { error: 'Brief wajib diisi.' }); return; }
  if (activeMode() === 'unconfigured') {
    sendJson(response, 503, { error: 'Langflow belum dikonfigurasi. Gunakan LANGFLOW_MCP_URL + LANGFLOW_MCP_API_KEY, atau LANGFLOW_FLOW_ID UUID + LANGFLOW_API_KEY.' });
    return;
  }
  const sessionId = `projectmatic-web-${crypto.randomUUID()}`;
  try {
    const prompt = buildPrompt(input);
    const mode = activeMode();
    const result = mode === 'mcp' ? await runMcp(prompt, sessionId) : await runFlow(prompt, sessionId);
    sendJson(response, 200, {
      output: result.output,
      provenance: {
        provider: mode === 'mcp' ? 'Langflow MCP' : 'Langflow Flow API',
        flowId: mode === 'mcp' ? `MCP tool: ${result.toolName}` : config.flowId,
        sessionId: result.sessionId,
        generatedAt: new Date().toISOString(),
        knowledge: mode === 'mcp' ? 'Langflow project MCP tool execution' : 'AstraDB data_ratecard via Flow',
      },
    });
  } catch (error) {
    const message = error.name === 'TimeoutError' ? 'Langflow melebihi batas waktu 120 detik.' : error.message || 'Tidak dapat menghubungi Langflow.';
    sendJson(response, 502, { error: message });
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/api/health') {
    const mode = activeMode();
    sendJson(response, 200, { configured: mode !== 'unconfigured', provider: mode === 'mcp' ? 'Langflow MCP' : 'Langflow Flow API', mode });
    return;
  }
  if (url.pathname === '/api/generate-proposal' && request.method === 'POST') { await runLangflow(request, response); return; }
  if (request.method !== 'GET' && request.method !== 'HEAD') { sendJson(response, 405, { error: 'Method tidak diizinkan.' }); return; }
  const relativePath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^[/\\]+/, '');
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) { sendJson(response, 403, { error: 'Akses ditolak.' }); return; }
  fs.readFile(filePath, (error, content) => {
    if (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end('Not found'); return; }
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  });
});

server.listen(config.port, () => {
  console.log(`ProjectMatic berjalan di http://localhost:${config.port}`);
  const mode = activeMode();
  console.log(mode === 'mcp' ? 'Langflow MCP ready: project endpoint configured' : mode === 'flow' ? `Langflow Flow API ready: ${config.flowId}` : 'Langflow belum dikonfigurasi. Salin .env.example menjadi .env.');
});
