// Chat client for Tauri app - uses Rust backend for server-side processing
import { ChatRequest } from './chat-clients/types';
import { isTauriApp } from './environment';

// Tauri-based chat handler that uses Rust backend
async function* handleTauriChat(request: ChatRequest): AsyncGenerator<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');
  const { v4: uuidv4 } = await import('uuid');
  
  const streamId = uuidv4();
  
  try {
    // Default API key to "None" if empty
    const apiKey = request.apiKey && request.apiKey.trim() !== "" ? request.apiKey : "None";
    
    // Start the streaming request to Rust backend
    await invoke('handle_chat_stream', {
      request: {
        modelId: request.modelId,
        messages: request.messages,
        apiKey: apiKey,
        systemPrompt: request.systemPrompt,
        proxySettings: request.proxySettings,
        streamEnabled: request.streamEnabled ?? true,
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 4096,
        provider: request.provider,
      },
      streamId,
    });

    // Create a promise-based stream to yield chunks
    let isCompleted = false;
    let resolveNext: ((value: { value: string; done: boolean }) => void) | null = null;
    let rejectNext: ((error: Error) => void) | null = null;
    const chunks: string[] = [];

    // Listen for stream chunks from Rust backend
    const streamUnlisten = await listen(`chat-stream-${streamId}`, (event: { payload: unknown }) => {
      const chunk = event.payload as {
        content?: string;
        thinking_content?: string;
        error?: string;
        done: boolean;
      };

      if (chunk.error) {
        const error = new Error(chunk.error);
        if (rejectNext) {
          rejectNext(error);
          rejectNext = null;
          resolveNext = null;
        } else {
          chunks.push(`ERROR: ${chunk.error}`);
        }
        isCompleted = true;
        return;
      }

      // Handle thinking content - pass through as structured data
      if (chunk.thinking_content) {
        const thinkingChunk = JSON.stringify({
          type: 'thinking',
          content: chunk.thinking_content
        });
        if (resolveNext) {
          resolveNext({ value: thinkingChunk, done: false });
          resolveNext = null;
          rejectNext = null;
        } else {
          chunks.push(thinkingChunk);
        }
      }

      // Handle regular content - pass through cleanly
      if (chunk.content) {
        const contentChunk = JSON.stringify({
          type: 'content',
          content: chunk.content
        });
        if (resolveNext) {
          resolveNext({ value: contentChunk, done: false });
          resolveNext = null;
          rejectNext = null;
        } else {
          chunks.push(contentChunk);
        }
      }

      if (chunk.done) {
        isCompleted = true;
        if (resolveNext) {
          resolveNext({ value: '', done: true });
          resolveNext = null;
          rejectNext = null;
        }
      }
    });

    // Yield chunks as they arrive
    while (!isCompleted || chunks.length > 0) {
      if (chunks.length > 0) {
        const chunk = chunks.shift()!;
        if (chunk.startsWith('ERROR: ')) {
          throw new Error(chunk.substring(7));
        }
        yield chunk;
      } else if (!isCompleted) {
        // Wait for next chunk
        const result = await new Promise<{ value: string; done: boolean }>((resolve, reject) => {
          resolveNext = resolve;
          rejectNext = reject;
        });
        
        if (result.done) {
          break;
        }
        
        if (result.value) {
          yield result.value;
        }
      } else {
        break;
      }
    }

    // Clean up the stream listener
    streamUnlisten();

  } catch (error) {
    console.error('Tauri chat error:', error);
    throw error;
  }
}

// Fallback for web environment (should not happen in Tauri app)
async function* handleWebFallback(): AsyncGenerator<string> {
  throw new Error('This app requires Tauri environment. Web fallback not supported.');
}

// Main client-side chat handler
export async function* handleChatClientSide(request: ChatRequest): AsyncGenerator<string> {
  if (isTauriApp()) {
    yield* handleTauriChat(request);
  } else {
    yield* handleWebFallback();
  }
}

// Unified chat handler 
export async function* handleChat(request: ChatRequest): AsyncGenerator<string> {
  yield* handleChatClientSide(request);
} 