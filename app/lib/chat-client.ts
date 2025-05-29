// Unified client-side chat handler for all deployment modes
import { ChatRequest } from './chat-clients/types';
import { handleUnifiedClientSide } from './chat-clients/unified-client';

// Main client-side chat handler
export async function* handleChatClientSide(request: ChatRequest): AsyncGenerator<string> {
  yield* handleUnifiedClientSide(request);
}

// Unified chat handler that always uses client-side handlers
export async function* handleChat(request: ChatRequest): AsyncGenerator<string> {
  yield* handleChatClientSide(request);
} 