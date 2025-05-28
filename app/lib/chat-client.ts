// Unified client-side chat handler for all deployment modes
import { ChatRequest } from './chat-clients/types';
import { handleOpenAIClientSide } from './chat-clients/openai-client';
import { handleAnthropicClientSide } from './chat-clients/anthropic-client';
import { handleGeminiClientSide } from './chat-clients/gemini-client';
import { handleQwenClientSide } from './chat-clients/qwen-client';
import { handleDeepseekClientSide } from './chat-clients/deepseek-client';
import { handleVolcesClientSide } from './chat-clients/volces-client';

// Main client-side chat handler
export async function* handleChatClientSide(request: ChatRequest): AsyncGenerator<string> {
  // Route based on provider
  switch (request.provider) {
    case 'OpenAI':
      yield* handleOpenAIClientSide(request);
      break;
    case 'Anthropic':
      yield* handleAnthropicClientSide(request);
      break;
    case 'Google':
      yield* handleGeminiClientSide(request);
      break;
    case 'Qwen':
      yield* handleQwenClientSide(request);
      break;
    case 'Deepseek':
      yield* handleDeepseekClientSide(request);
      break;
    case 'Volces':
      yield* handleVolcesClientSide(request);
      break;
    default:
      throw new Error(`Client-side handler not implemented for provider: ${request.provider} (model: ${request.modelId})`);
  }
}

// Unified chat handler that always uses client-side handlers
export async function* handleChat(request: ChatRequest): AsyncGenerator<string> {
  yield* handleChatClientSide(request);
} 