import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
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

// Helper to map our generic message roles to provider-specific roles if needed
// For Gemini, 'assistant' is 'model'. 'system' prompts are handled differently.
function mapMessagesToGeminiFormat(messages: ChatMessageCore[]) {
    return messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role as 'user' | 'model',
        parts: [{ text: msg.content }],
    }));
}

async function handleGeminiRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    ...(systemPrompt && { systemInstruction: { role: "system", parts: [{text: systemPrompt}] } }), // Pass system prompt if available
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ]
  });

  const historyForGemini = mapMessagesToGeminiFormat(messages.filter(m => m.role !== 'system')); 
  const lastUserMessageContent = historyForGemini.pop()?.parts[0]?.text; 

  if (!lastUserMessageContent) {
    throw new Error("Last message must be from user and contain content for Gemini chat.");
  }

  const chat = model.startChat({
    history: historyForGemini, 
  });
  const result = await chat.sendMessage(lastUserMessageContent);
  return result.response.text();
}

async function handleQwenRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string) {
    const url = `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`;
    const qwenMessages: {role: string, content: string}[] = messages
        .filter(msg => msg.role !== 'model') // Qwen doesn't use 'model' role
        .map(msg => ({ role: msg.role, content: msg.content }));

    if (systemPrompt) {
        const systemMessageIndex = qwenMessages.findIndex(m => m.role === 'system');
        if (systemMessageIndex !== -1) qwenMessages.splice(systemMessageIndex, 1);
        qwenMessages.unshift({ role: 'system', content: systemPrompt });
    }

    const payload = {
        model: modelId, 
        input: { messages: qwenMessages },
        parameters: { /* incremental_output: false */ }
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Qwen API request failed: ${response.status} ${errorBody}`);
    }
    const result = await response.json();
    return result.output?.text || result.output?.choices?.[0]?.message?.content || "No text response from Qwen.";
}

// --- OpenAI Handler ---
async function handleOpenAIRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string) {
  const openai = new OpenAI({ apiKey });

  const apiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role as 'user' | 'assistant' | 'system', // OpenAI uses 'assistant'
    content: msg.content,
  }));

  if (systemPrompt && !apiMessages.find(m => m.role === 'system')) {
    apiMessages.unshift({ role: 'system', content: systemPrompt });
  }

  const completion = await openai.chat.completions.create({
    model: modelId,
    messages: apiMessages,
    // stream: false, // for non-streaming
  });
  return completion.choices[0]?.message?.content || "No response from OpenAI.";
}

// --- Anthropic Handler ---
async function handleAnthropicRequest(apiKey: string, modelId: string, messages: ChatMessageCore[], systemPrompt?: string) {
  const anthropic = new Anthropic({ apiKey });
  
  // Anthropic expects messages alternating user/assistant. System prompt is a top-level param.
  const filteredMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
  const apiMessages: Anthropic.Messages.MessageParam[] = filteredMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant', // Already filtered
    content: msg.content,
  }));

  // Ensure the last message is from the user if it's a conversation, or handle single message case
  // For simplicity, we assume the message list from client is already in order.
  // Anthropic API might require the first message to be user if there's more than one.
  if (apiMessages.length > 0 && apiMessages[0].role !== 'user') {
      // This is a simple fix, but a more robust solution might be needed
      // depending on how conversation history is constructed and sent from client.
      console.warn("Anthropic: First message was not from user, prepending a placeholder if needed or this might error.");
      // Potentially, if history starts with assistant, it might be invalid.
  }

  const response = await anthropic.messages.create({
    model: modelId,
    max_tokens: 2048, // Example, make configurable later
    ...(systemPrompt && { system: systemPrompt }),
    messages: apiMessages,
    // stream: false, // for non-streaming
  });
  
  // Assuming response.content is an array of ContentBlock objects
  // and we want to concatenate text from TextBlock objects.
  let responseText = "";
  if (response.content && Array.isArray(response.content)) {
    response.content.forEach(block => {
      if (block.type === 'text') {
        responseText += block.text;
      }
    });
  }
  return responseText || "No text response from Anthropic.";
}

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId, apiKey, systemPrompt } = await req.json() as ChatRequestBody;

    if (!apiKey) return NextResponse.json({ error: 'API key is missing' }, { status: 400 });
    if (!modelId) return NextResponse.json({ error: 'Model ID is missing' }, { status: 400 });
    if (!messages || messages.length === 0) return NextResponse.json({ error: 'Messages are missing' }, { status: 400 });

    let responseText: string;
    const providerId = modelId.split('-')[0].toLowerCase(); // Basic provider detection

    console.log(`Routing request for model: ${modelId} (Provider detected: ${providerId})`);

    // TODO: Get provider from store model object for more robust routing.
    // For now, simple string matching based on common model ID prefixes.
    if (modelId.toLowerCase().startsWith('gpt')) {
      responseText = await handleOpenAIRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('claude')) {
      responseText = await handleAnthropicRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('gemini')) {
      responseText = await handleGeminiRequest(apiKey, modelId, messages, systemPrompt);
    } else if (modelId.toLowerCase().startsWith('qwen') || modelId.toLowerCase().startsWith('deepseek')) { // Group Deepseek with Qwen for now if structure is similar
        // NOTE: Deepseek might need its own handler if API structure differs significantly from Qwen.
        // Assuming Deepseek uses a similar endpoint structure or it will fail if not handled specifically.
        if (modelId.toLowerCase().startsWith('deepseek')){
            console.warn("Deepseek model routed to Qwen handler. Verify API compatibility.");
            // Placeholder - Deepseek may need its own specific URL and payload structure.
            // For now, it will attempt Qwen logic which will likely fail if Deepseek API is different.
            // responseText = await handleDeepseekRequest(apiKey, modelId, messages, systemPrompt);
        }
      responseText = await handleQwenRequest(apiKey, modelId, messages, systemPrompt); 
    } else {
      return NextResponse.json({ error: `Unsupported model provider for ID: ${modelId}` }, { status: 400 });
    }

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error('Error in /api/chat POST:', error.message, error.stack);
    return NextResponse.json({ error: error.message || 'An unknown server error occurred' }, { status: 500 });
  }
} 