// Unified client-side chat handler for all deployment modes
import { ChatRequest } from './chat-clients/types';
import { handleUnifiedClientSide } from './chat-clients/unified-client';
import { handleTauriChat } from './chat-clients/tauri-client';
import { isTauriApp } from './environment';

// Type declaration for Tauri global
declare global {
  interface Window {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
    __TAURI_INVOKE__?: unknown;
  }
}

// Main client-side chat handler
export async function* handleChatClientSide(request: ChatRequest): AsyncGenerator<string> {
  if (isTauriApp()) {
    // Always use Tauri backend when running in desktop app
    yield* handleTauriChat(request);
  } else {
    // Use unified client-side handlers for web deployment
    yield* handleUnifiedClientSide(request);
  }
}

// Unified chat handler that always uses client-side handlers
export async function* handleChat(request: ChatRequest): AsyncGenerator<string> {
  yield* handleChatClientSide(request);
} 