export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpToolCallRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpToolCallResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}
