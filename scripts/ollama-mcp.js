const readline = require('readline');
const http = require('http');

// Set up readline interface for line-by-line stdio communication
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// Helper to log debug info to stderr (so it doesn't pollute stdout JSON-RPC channel)
function logDebug(msg) {
  console.error(`[Ollama-MCP Debug] ${msg}`);
}

logDebug("Starting Ollama MCP Server...");

// HTTP Request helper using Node.js standard http library
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Handler for all incoming JSON-RPC messages
async function handleMessage(message) {
  if (!message || typeof message !== 'object') return;
  const { jsonrpc, id, method, params } = message;

  if (jsonrpc !== '2.0') {
    sendError(id, -32600, "Invalid Request: expected jsonrpc '2.0'");
    return;
  }

  logDebug(`Received request/notification: ${method}`);

  switch (method) {
    case 'initialize':
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: "ollama-mcp",
          version: "1.0.0"
        }
      });
      break;

    case 'notifications/initialized':
      // Acknowledged, no response required
      break;

    case 'tools/list':
      sendResponse(id, {
        tools: [
          {
            name: "query_local_llm",
            description: "Send a prompt directly to your local Ollama LLM and get a response. Useful for offline coding, explanation, or when cloud credits are depleted.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "The prompt or instructions to send to the local model."
                },
                model: {
                  type: "string",
                  description: "The Ollama model to use. Defaults to qwen2.5-coder:1.5b.",
                  default: "qwen2.5-coder:1.5b"
                }
              },
              required: ["prompt"]
            }
          },
          {
            name: "check_local_ollama_status",
            description: "Checks if the local Ollama service is running and lists the downloaded models.",
            inputSchema: {
              type: "object",
              properties: {}
            }
          }
        ]
      });
      break;

    case 'tools/call':
      const { name, arguments: args } = params || {};
      if (name === 'query_local_llm') {
        const prompt = args.prompt;
        const model = args.model || 'qwen2.5-coder:1.5b';
        try {
          const postData = JSON.stringify({
            model: model,
            prompt: prompt,
            stream: false
          });

          logDebug(`Querying local Ollama model '${model}'...`);
          const res = await makeRequest({
            hostname: '127.0.0.1',
            port: 11434,
            path: '/api/generate',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          }, postData);

          if (res.statusCode === 200) {
            const parsed = JSON.parse(res.body);
            sendResponse(id, {
              content: [
                {
                  type: "text",
                  text: parsed.response || ""
                }
              ]
            });
          } else {
            sendResponse(id, {
              content: [
                {
                  type: "text",
                  text: `Error: Ollama returned status code ${res.statusCode}. Body: ${res.body}`
                }
              ],
              isError: true
            });
          }
        } catch (err) {
          logDebug(`Connection to Ollama failed: ${err.message}`);
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: `Error: Could not connect to local Ollama. Please make sure Ollama is downloaded from https://ollama.com, installed, running, and the model is downloaded (run 'ollama pull ${model}'). Details: ${err.message}`
              }
            ],
            isError: true
          });
        }
      } else if (name === 'check_local_ollama_status') {
        try {
          logDebug("Checking Ollama status...");
          const res = await makeRequest({
            hostname: '127.0.0.1',
            port: 11434,
            path: '/api/tags',
            method: 'GET'
          });

          if (res.statusCode === 200) {
            const parsed = JSON.parse(res.body);
            const models = (parsed.models || []).map(m => `- ${m.name} (${Math.round(m.size / (1024 * 1024 * 1024) * 100) / 100} GB)`).join('\n');
            const summary = models 
              ? `Ollama is running. Available models:\n${models}`
              : `Ollama is running, but no models have been pulled yet. Run 'ollama pull qwen2.5-coder:1.5b' in your terminal.`;
            sendResponse(id, {
              content: [
                {
                  type: "text",
                  text: summary
                }
              ]
            });
          } else {
            sendResponse(id, {
              content: [
                {
                  type: "text",
                  text: `Ollama service returned status code ${res.statusCode}.`
                }
              ],
              isError: true
            });
          }
        } catch (err) {
          logDebug(`Ollama connection check failed: ${err.message}`);
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: `Ollama is NOT running or unreachable on port 11434. Please start it on your device. Error: ${err.message}`
              }
            ],
            isError: true
          });
        }
      } else {
        sendError(id, -32601, `Method not found: ${name}`);
      }
      break;

    default:
      // Handle other methods with standard method-not-found
      if (id !== undefined) {
        sendError(id, -32601, `Method not found: ${method}`);
      }
      break;
  }
}

// Send standard JSON-RPC response
function sendResponse(id, result) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id,
    result
  });
  process.stdout.write(payload + '\n');
}

// Send JSON-RPC error
function sendError(id, code, message) {
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message }
  });
  process.stdout.write(payload + '\n');
}

// Feed lines from stdin to the parser
rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    handleMessage(msg);
  } catch (err) {
    logDebug(`Error parsing line as JSON: ${err.message}`);
    sendError(null, -32700, "Parse error");
  }
});
