import {NextRequest, NextResponse} from 'next/server';
import {Content, GoogleGenerativeAI, HarmBlockThreshold, HarmCategory} from '@google/generative-ai';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// We will add Qwen specific imports or helpers later if needed.

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

async function* handleGeminiRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string): AsyncGenerator<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    ...(systemPrompt && { systemInstruction: { role: "system", parts: [{text: systemPrompt}] } }),
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ]
  });

  const geminiMessages = mapMessagesToGeminiFormat(messages.filter(m => m.role !== 'system'));
  
  // For streaming, generateContentStream is often simpler as it takes the full conversation history directly.
  // The systemInstruction is handled at the model level.
  if (geminiMessages.length === 0) {
      console.warn("Gemini: No user/assistant messages to send after filtering.");
      // If only a system prompt was provided, systemInstruction handles it.
      // If no messages at all, this will likely result in no output or an error from the API.
      // We might need to send a dummy user message if the API requires it even with systemInstruction.
      // For now, proceed, and the API will decide.
  }

  try {
    const stream = await model.generateContentStream({ contents: geminiMessages });
    for await (const chunk of stream.stream) {
        const text = chunk.text();
        if (text) {
            yield text;
        }
    }
  } catch (e: unknown) {
      console.error("Gemini streaming error:", e);
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

async function* handleQwenRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string): AsyncGenerator<string> {
    const url = `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`;
    const qwenMessages: {role: string, content: string}[] = messages
        .filter(msg => msg.role !== 'model') 
        .map(msg => ({ role: msg.role, content: msg.content }));

    if (systemPrompt) {
        const systemMessageIndex = qwenMessages.findIndex(m => m.role === 'system');
        if (systemMessageIndex !== -1) qwenMessages.splice(systemMessageIndex, 1);
        qwenMessages.unshift({ role: 'system', content: systemPrompt });
    } else {
        // If systemPrompt is empty or undefined, remove any existing system message
        const systemMessageIndex = qwenMessages.findIndex(m => m.role === 'system');
        if (systemMessageIndex !== -1) {
            qwenMessages.splice(systemMessageIndex, 1);
        }
    }

    const payload = {
        model: modelId, 
        input: { messages: qwenMessages },
        parameters: { incremental_output: true } // Enable streaming for Qwen
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${apiKey}`,
            'X-DashScope-SSE': 'enable' // Required for SSE streaming with Qwen
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
        // Qwen SSE events are separated by double newlines
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
                        // According to Dashscope docs, finish_reason can be in the last event's output.choices[0]
                        if (parsedData.output && parsedData.output.choices && parsedData.output.choices[0] && parsedData.output.choices[0].finish_reason === "stop") {
                             return; // Stream finished
                        }
                        // Also check for top-level finish_reason as seen in some non-streaming examples
                        if (parsedData.output && parsedData.output.finish_reason === "stop") {
                            return; // Stream finished
                        }
                    } catch (e) {
                        console.error("Error parsing Qwen SSE event:", e, "Event string:", dataJson);
                    }
                }
            }
        }
    }
    // If loop finishes due to reader.done but buffer might have trailing incomplete data
    if (buffer.startsWith("data:")) { // Check for any remaining data
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
    const { messages, modelId, apiKey, systemPrompt } = await req.json() as ChatRequestBody;

    if (!apiKey) return NextResponse.json({ error: 'API key is missing' }, { status: 400 });
    if (!modelId) return NextResponse.json({ error: 'Model ID is missing' }, { status: 400 });
    if (!messages || messages.length === 0) return NextResponse.json({ error: 'Messages are missing' }, { status: 400 });

    let streamGenerator: AsyncGenerator<string>;
    const providerId = modelId.split('-')[0].toLowerCase(); // Basic provider detection

    console.log(`Routing stream request for model: ${modelId} (Provider detected: ${providerId})`);

    // TODO: Get provider from store model object for more robust routing.
    // For now, simple string matching based on common model ID prefixes.
    if (modelId.toLowerCase().startsWith('gpt')) {
      streamGenerator = handleOpenAIRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('claude')) {
      streamGenerator = handleAnthropicRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('gemini')) {
      streamGenerator = handleGeminiRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('qwen')) {
      streamGenerator = handleQwenRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('deepseek')) {
      // console.warn("Deepseek model routed to Qwen handler. Verify API compatibility for streaming."); // Original warning
      // TODO: Implement a specific Deepseek streaming handler if its API differs from Qwen's SSE.
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