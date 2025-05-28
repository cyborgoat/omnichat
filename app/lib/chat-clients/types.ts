export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  modelId: string;
  provider: string;
  apiKey: string;
  systemPrompt?: string;
  proxySettings?: {
    enabled?: boolean;
    http?: string;
    https?: string;
    socks?: string;
  };
} 