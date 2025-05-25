import {NextRequest, NextResponse} from 'next/server';
import {Content} from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'node:child_process';

// We will add Qwen specific imports or helpers later if needed.

// Curl-based proxy fetch function
async function curlFetch(url: string, options: RequestInit, proxySettings?: { enabled?: boolean; http?: string; https?: string; socks?: string }): Promise<Response> {
  if (!proxySettings || !proxySettings.enabled || (!proxySettings.socks && !proxySettings.https && !proxySettings.http)) {
    // No proxy or proxy disabled, use regular fetch
    return fetch(url, options);
  }

  console.log(`🌐 Using curl with proxy for: ${url}`);
  
  return new Promise((resolve, reject) => {
    const curlArgs = ['-s', '-i']; // -s for silent, -i to include headers
    
    // Add proxy settings
    if (proxySettings.socks) {
      curlArgs.push('--proxy', proxySettings.socks);
      console.log(`📡 Using SOCKS proxy: ${proxySettings.socks}`);
    } else if (proxySettings.https) {
      curlArgs.push('--proxy', proxySettings.https);
      console.log(`📡 Using HTTPS proxy: ${proxySettings.https}`);
    } else if (proxySettings.http) {
      curlArgs.push('--proxy', proxySettings.http);
      console.log(`📡 Using HTTP proxy: ${proxySettings.http}`);
    }
    
    // Add method
    if (options.method && options.method !== 'GET') {
      curlArgs.push('-X', options.method);
    }
    
    // Add headers
    if (options.headers) {
      const headers = options.headers as Record<string, string>;
      Object.entries(headers).forEach(([key, value]) => {
        curlArgs.push('-H', `${key}: ${value}`);
      });
    }
    
    // Add body
    if (options.body) {
      curlArgs.push('-d', options.body as string);
    }
    
    // Add URL
    curlArgs.push(url);
    
    console.log(`📡 Executing curl with args:`, curlArgs.slice(0, -1).join(' '), '[URL]');
    
    const curl = spawn('curl', curlArgs);
    let stdout = '';
    let stderr = '';
    
    curl.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    curl.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    curl.on('close', (code) => {
      if (code !== 0) {
        console.error(`❌ Curl failed with code ${code}:`, stderr);
        reject(new Error(`Curl failed: ${stderr}`));
        return;
      }
      
      console.log(`✅ Curl request successful`);
      
      // Parse response
      const parts = stdout.split('\r\n\r\n');
      const headerPart = parts[0];
      const bodyPart = parts.slice(1).join('\r\n\r\n');
      
      // Parse status line
      const statusLine = headerPart.split('\r\n')[0];
      const statusMatch = statusLine.match(/HTTP\/[\d.]+\s+(\d+)\s*(.*)/);
      const status = statusMatch ? parseInt(statusMatch[1]) : 200;
      const statusText = statusMatch ? statusMatch[2] : 'OK';
      
      // Parse headers
      const headers = new Headers();
      const headerLines = headerPart.split('\r\n').slice(1);
      headerLines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          headers.set(key, value);
        }
      });
      
      const response = {
        ok: status >= 200 && status < 300,
        status,
        statusText,
        headers,
        json: async () => JSON.parse(bodyPart),
        text: async () => bodyPart,
        body: null,
      } as Response;
      
      resolve(response);
    });
    
    curl.on('error', (error) => {
      console.error(`❌ Curl spawn error:`, error);
      reject(error);
    });
  });
}

interface ChatMessageCore {
  role: 'user' | 'assistant' | 'system' | 'model'; // model is for gemini input, assistant for others
  content: string;
  // Add other potential fields like `name` or `tool_calls` if supporting those later
}

interface ChatRequestBody {
  messages: ChatMessageCore[]; 
  modelId: string;
  apiKey?: string; 
  systemPrompt?: string; 
  proxySettings?: {
    enabled?: boolean;
    http?: string;
    https?: string;
    socks?: string;
  };
  // providerId?: string; // Could be useful for more direct routing if modelId isn't unique enough
}

// Helper to map our generic message roles to Gemini's Content format.
// Gemini expects Content objects with a role ('user' or 'model') and parts (an array of Part objects).
function mapMessagesToGeminiFormat(messages: ChatMessageCore[]): Content[] {
    return messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant') // Gemini history only takes user/model roles
        .map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user', // Map 'assistant' to 'model' for Gemini
            parts: [{ text: msg.content }],
        } as Content)); // Assert as Content type
}

async function* handleGeminiRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string, proxySettings?: { enabled?: boolean; http?: string; https?: string; socks?: string }): AsyncGenerator<string> {
  console.log(`[GEMINI] Using direct HTTP API with proxy settings:`, proxySettings);
  
  // Prepare the request payload
  const geminiMessages = mapMessagesToGeminiFormat(messages.filter(m => m.role !== 'system'));
  
  if (geminiMessages.length === 0) {
    console.warn("[GEMINI] No user/assistant messages to send after filtering.");
  }

  // Convert messages to the correct format for Gemini API
  const contents = geminiMessages.length > 0 ? geminiMessages : [
    {
      parts: [
        {
          text: "Hello"
        }
      ]
    }
  ];

  const payload = {
    contents: contents,
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
    ...(systemPrompt && { 
      systemInstruction: { 
        parts: [{ text: systemPrompt }] 
      } 
    }),
  };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  };

  console.log(`[GEMINI] Making direct HTTP request to: ${url}`);
  console.log(`[GEMINI] Using proxy settings:`, !!proxySettings);

  try {
    const response = await curlFetch(url, fetchOptions, proxySettings);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GEMINI] HTTP error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Gemini API HTTP error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log(`[GEMINI] Successfully connected, processing response...`);

    // Process JSON response
    const responseData = await response.json();
    console.log(`[GEMINI] Response data:`, responseData);
    
    if (responseData.candidates && responseData.candidates.length > 0) {
      const candidate = responseData.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const text = candidate.content.parts[0].text;
        if (text) {
          // Simulate streaming by yielding the text in chunks
          const words = text.split(' ');
          for (let i = 0; i < words.length; i++) {
            const chunk = i === 0 ? words[i] : ' ' + words[i];
            yield chunk;
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }
    } else {
      console.warn("[GEMINI] No candidates in response");
      yield "No response from Gemini API";
    }
    
    console.log(`[GEMINI] Response processing completed successfully`);
  } catch (e: unknown) {
    console.error("[GEMINI] Direct HTTP request error:", e);
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Gemini API streaming error: ${message}`);
  }
}

// --- Deepseek Handler (OpenAI Compatible) ---
async function* handleDeepseekRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string): AsyncGenerator<string> {
  const deepseek = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://api.deepseek.com' 
  });

  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));

  // Ensure the provided systemPrompt is used, replacing any existing system message.
  if (systemPrompt) {
    const systemMessageIndex = apiMessages.findIndex(m => m.role === 'system');
    if (systemMessageIndex !== -1) {
      apiMessages[systemMessageIndex].content = systemPrompt;
    } else {
      apiMessages.unshift({ role: 'system', content: systemPrompt });
    }
  } else {
    // If no systemPrompt is provided, remove any existing system message from the array
    const systemMessageIndex = apiMessages.findIndex(m => m.role === 'system');
    if (systemMessageIndex !== -1) {
      apiMessages.splice(systemMessageIndex, 1);
    }
  }
  
  try {
    const stream = await deepseek.chat.completions.create({
        model: modelId,
        messages: apiMessages,
        stream: true,
    });

    for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
        }
    }
  } catch (e: unknown) {
    console.error("Deepseek API streaming error:", e);
    const message = e instanceof Error ? e.message : String(e);
    // Prepend provider name to the error message for clarity on the client-side
    throw new Error(`Deepseek API error: ${message}`); 
  }
}

// --- Qwen Handler (Updated for QwQ Deep Thinking Models) ---
async function* handleQwenRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string): AsyncGenerator<string> {
    // Check if this is a deep thinking model (QwQ, Qwen3, or DeepSeek-R1)
    const isDeepThinkingModel = modelId.includes('qwq') || 
                               modelId.includes('qwen-plus-latest') || 
                               modelId.includes('qwen-plus-2025') ||
                               modelId.includes('qwen-turbo-latest') ||
                               modelId.includes('deepseek-r1');

    // Use OpenAI-compatible endpoint for QwQ and deep thinking models
    if (isDeepThinkingModel) {
        const openaiCompatibleUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        
        const qwenMessages: {role: string, content: string}[] = messages
            .filter(msg => msg.role !== 'model') 
            .map(msg => ({ role: msg.role, content: msg.content }));

        if (systemPrompt) {
            const systemMessageIndex = qwenMessages.findIndex(m => m.role === 'system');
            if (systemMessageIndex !== -1) {
                qwenMessages[systemMessageIndex].content = systemPrompt;
            } else {
                qwenMessages.unshift({ role: 'system', content: systemPrompt });
            }
        }

        const payload = {
            model: modelId,
            messages: qwenMessages,
            stream: true,
            // Enable thinking mode for Qwen3 models
            ...(modelId.includes('qwen-plus-latest') || modelId.includes('qwen-turbo-latest') || modelId.includes('qwen-plus-2025') ? 
                { enable_thinking: true } : {})
        };

        const response = await fetch(openaiCompatibleUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Qwen OpenAI-compatible API request failed: ${response.status} ${errorBody}`);
            throw new Error(`Qwen API request failed: ${response.status} ${errorBody}`);
        }
        
        if (!response.body) {
            throw new Error("Qwen response body is null.");
        }

        // Process OpenAI-compatible SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            let eolIndex;
            while ((eolIndex = buffer.indexOf('\n')) >= 0) {
                const line = buffer.substring(0, eolIndex);
                buffer = buffer.substring(eolIndex + 1);

                if (line.startsWith("data: ")) {
                    const dataJson = line.substring(6).trim();
                    if (dataJson === "[DONE]") {
                        return;
                    }
                    
                    try {
                        const parsedData = JSON.parse(dataJson);
                        const choice = parsedData.choices?.[0];
                        
                        if (choice?.delta?.content) {
                            yield choice.delta.content;
                        }
                        
                        // Handle thinking content for Qwen3 models
                        if (choice?.delta?.reasoning_content) {
                            // Include thinking content with a special marker for client-side processing
                            yield `__THINKING_START__${choice.delta.reasoning_content}__THINKING_END__`;
                        }
                        
                        if (choice?.finish_reason === "stop") {
                            return;
                        }
                    } catch (e) {
                        console.error("Error parsing Qwen OpenAI-compatible SSE event:", e, "Event string:", dataJson);
                    }
                }
            }
        }
    } else {
        // Use original Dashscope API for regular Qwen models
        const url = `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`;
        const qwenMessages: {role: string, content: string}[] = messages
            .filter(msg => msg.role !== 'model') 
            .map(msg => ({ role: msg.role, content: msg.content }));

        if (systemPrompt) {
            const systemMessageIndex = qwenMessages.findIndex(m => m.role === 'system');
            if (systemMessageIndex !== -1) qwenMessages.splice(systemMessageIndex, 1);
            qwenMessages.unshift({ role: 'system', content: systemPrompt });
        } else {
            const systemMessageIndex = qwenMessages.findIndex(m => m.role === 'system');
            if (systemMessageIndex !== -1) {
                qwenMessages.splice(systemMessageIndex, 1);
            }
        }

        const payload = {
            model: modelId, 
            input: { messages: qwenMessages },
            parameters: { incremental_output: true }
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${apiKey}`,
                'X-DashScope-SSE': 'enable'
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Qwen API request failed: ${response.status} ${errorBody}`);
            throw new Error(`Qwen API request failed: ${response.status} ${errorBody}`);
        }
        
        if (!response.body) {
            throw new Error("Qwen response body is null.");
        }

        // Process SSE stream from Qwen
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            let eolIndex;
            while ((eolIndex = buffer.indexOf('\n\n')) >= 0) { 
                const eventLines = buffer.substring(0, eolIndex).split('\n');
                buffer = buffer.substring(eolIndex + 2);

                for (const line of eventLines) {
                    if (line.startsWith("data:")) {
                        const dataJson = line.substring(5).trim();
                        try {
                            const parsedData = JSON.parse(dataJson);
                            if (parsedData.output && parsedData.output.text) {
                                yield parsedData.output.text;
                            }
                            if (parsedData.output && parsedData.output.choices && parsedData.output.choices[0] && parsedData.output.choices[0].finish_reason === "stop") {
                                 return;
                            }
                            if (parsedData.output && parsedData.output.finish_reason === "stop") {
                                return;
                            }
                        } catch (e) {
                            console.error("Error parsing Qwen SSE event:", e, "Event string:", dataJson);
                        }
                    }
                }
            }
        }
        
        if (buffer.startsWith("data:")) {
            const dataJson = buffer.substring(5).trim();
            try {
                const parsedData = JSON.parse(dataJson);
                if (parsedData.output && parsedData.output.text) {
                    yield parsedData.output.text;
                }
            } catch (e) {
                console.error("Error parsing Qwen SSE event (final buffer):", e, "Event string:", dataJson);
            }
        }
    }
}

// --- OpenAI Handler ---
async function* handleOpenAIRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string): AsyncGenerator<string> {
  const openai = new OpenAI({ apiKey });

  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  }));

  // Ensure the provided systemPrompt is used, replacing any existing system message.
  if (systemPrompt) {
    const systemMessageIndex = apiMessages.findIndex(m => m.role === 'system');
    if (systemMessageIndex !== -1) {
      apiMessages[systemMessageIndex].content = systemPrompt;
    } else {
      apiMessages.unshift({ role: 'system', content: systemPrompt });
    }
  } else {
    // If no systemPrompt is provided, remove any existing system message from the array
    // to prevent an old one from being used unintentionally.
    const systemMessageIndex = apiMessages.findIndex(m => m.role === 'system');
    if (systemMessageIndex !== -1) {
      apiMessages.splice(systemMessageIndex, 1);
    }
  }
  
  try {
    const stream = await openai.chat.completions.create({
        model: modelId,
        messages: apiMessages,
        stream: true,
    });

    for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
        }
    }
  } catch (e: unknown) {
    console.error("OpenAI streaming error:", e);
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`OpenAI API streaming error: ${message}`);
  }
}

// --- Anthropic Handler ---
async function* handleAnthropicRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string): AsyncGenerator<string> {
  const anthropic = new Anthropic({ apiKey });
  
  const filteredMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
  const apiMessages: Anthropic.Messages.MessageParam[] = filteredMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  if (apiMessages.length > 0 && apiMessages[0].role !== 'user') {
      console.warn("Anthropic: First message was not from user. This might cause issues.");
  }
  
  try {
    const stream = await anthropic.messages.stream({
        model: modelId,
        max_tokens: 2048, 
        ...(systemPrompt && { system: systemPrompt }),
        messages: apiMessages,
    });

    for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
        }
    }
  } catch (e: unknown) {
    console.error("Anthropic streaming error:", e);
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Anthropic API streaming error: ${message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId, apiKey, systemPrompt, proxySettings } = await req.json() as ChatRequestBody;

    if (!apiKey) return NextResponse.json({ error: 'API key is missing' }, { status: 400 });
    if (!modelId) return NextResponse.json({ error: 'Model ID is missing' }, { status: 400 });
    if (!messages || messages.length === 0) return NextResponse.json({ error: 'Messages are missing' }, { status: 400 });

    let streamGenerator: AsyncGenerator<string>;
    const providerId = modelId.split('-')[0].toLowerCase(); // Basic provider detection

    console.log(`Routing stream request for model: ${modelId} (Provider detected: ${providerId})`);
    console.log(`Proxy settings:`, proxySettings);

    // TODO: Get provider from store model object for more robust routing.
    // For now, simple string matching based on common model ID prefixes.
    if (modelId.toLowerCase().startsWith('gpt')) {
      streamGenerator = handleOpenAIRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('claude')) {
      streamGenerator = handleAnthropicRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('gemini')) {
      streamGenerator = handleGeminiRequest(apiKey, modelId, messages, systemPrompt, proxySettings);
    } else if (modelId.toLowerCase().startsWith('qwen') || modelId.toLowerCase().startsWith('qwq') || modelId.toLowerCase().includes('deepseek-r1')) {
      // Route all Qwen, QwQ, and DeepSeek-R1 models to the updated Qwen handler
      streamGenerator = handleQwenRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('deepseek')) {
      // Handle regular DeepSeek models (not R1)
      streamGenerator = handleDeepseekRequest(apiKey, modelId, messages, systemPrompt);
    } else {
      return NextResponse.json({ error: `Unsupported model provider for ID: ${modelId}` }, { status: 400 });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Asynchronously pipe the streamGenerator to the writable side of the TransformStream
    (async () => {
      try {
        for await (const chunk of streamGenerator) {
          await writer.write(encoder.encode(chunk));
        }
      } catch (error: unknown) {
        console.error('Error during stream generation piping:', error instanceof Error ? error.message : String(error));
        try {
            // Signal an error through the stream. Client must be able to parse this.
            // Using a simple prefix. Consider JSON for structured errors if client can handle it.
            const errorMessage = `STREAM_ERROR: ${error instanceof Error ? error.message : 'Unknown stream error'}`;
            await writer.write(encoder.encode(`\n${errorMessage}\n`));
        } catch (writeError: unknown) {
            console.error("Error writing error to stream:", writeError instanceof Error ? writeError.message : String(writeError));
        }
      } finally {
        try {
            await writer.close();
        } catch (closeError: unknown) {
            console.error("Error closing stream writer:", closeError instanceof Error ? closeError.message : String(closeError));
        }
      }
    })();

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', 
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache', // Ensure no caching for dynamic stream content
      },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown server error occurred';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Error in /api/chat POST (pre-stream):', message, stack);
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 