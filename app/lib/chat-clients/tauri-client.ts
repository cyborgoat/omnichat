import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { ChatRequest } from './types';
import { v4 as uuidv4 } from 'uuid';

// Tauri-based chat handler that uses Rust backend
export async function* handleTauriChat(request: ChatRequest): AsyncGenerator<string> {
  const streamId = uuidv4();
  
  // Set up listener for stream events
  const unlisten: UnlistenFn = await listen(`chat-stream-${streamId}`, (event) => {
    console.log('Received stream event:', event.payload);
  });

  try {
    // Start the streaming request
    await invoke('handle_chat_stream', {
      request: {
        modelId: request.modelId,
        messages: request.messages,
        apiKey: request.apiKey,
        systemPrompt: request.systemPrompt,
        proxySettings: request.proxySettings,
        streamEnabled: true,
        temperature: 0.7,
        maxTokens: 4096,
        provider: request.provider,
      },
      streamId,
    });

    // Create a promise-based stream to yield chunks
    let isCompleted = false;
    let resolveNext: ((value: { value: string; done: boolean }) => void) | null = null;
    let rejectNext: ((error: Error) => void) | null = null;
    const chunks: string[] = [];

    // Listen for stream chunks
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

      if (chunk.thinking_content) {
        const thinkingChunk = `__THINKING_START__${chunk.thinking_content}__THINKING_END__`;
        if (resolveNext) {
          resolveNext({ value: thinkingChunk, done: false });
          resolveNext = null;
          rejectNext = null;
        } else {
          chunks.push(thinkingChunk);
        }
      }

      if (chunk.content) {
        if (resolveNext) {
          resolveNext({ value: chunk.content, done: false });
          resolveNext = null;
          rejectNext = null;
        } else {
          chunks.push(chunk.content);
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
  } finally {
    // Clean up the main listener
    unlisten();
  }
} 