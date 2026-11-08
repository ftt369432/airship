import { MCP_TOOLS, executeMcpTool } from './tools.js';

export class AirshipMcpServer {
  public getTools() {
    return MCP_TOOLS;
  }

  public async callTool(name: string, args: Record<string, unknown>) {
    return await executeMcpTool(name, args);
  }

  public startStdio() {
    process.stdin.setEncoding('utf-8');
    let buffer = '';

    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const req = JSON.parse(line);
          if (req.method === 'tools/list') {
            const res = {
              jsonrpc: '2.0',
              id: req.id,
              result: { tools: this.getTools() }
            };
            process.stdout.write(JSON.stringify(res) + '\n');
          } else if (req.method === 'tools/call') {
            const toolResult = await this.callTool(req.params.name, req.params.arguments || {});
            const res = {
              jsonrpc: '2.0',
              id: req.id,
              result: toolResult
            };
            process.stdout.write(JSON.stringify(res) + '\n');
          }
        } catch (err: any) {
          const errRes = {
            jsonrpc: '2.0',
            id: null,
            error: { code: -32603, message: err.message }
          };
          process.stdout.write(JSON.stringify(errRes) + '\n');
        }
      }
    });
  }
}

if (process.argv[1]?.endsWith('server.js')) {
  const server = new AirshipMcpServer();
  server.startStdio();
}
