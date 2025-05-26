// Unified client-side chat handler for all deployment modes

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  modelId: string;
  apiKey: string;
  systemPrompt?: string;
  proxySettings?: {
    enabled?: boolean;
    http?: string;
    https?: string;
    socks?: string;
  };
}

// OpenAI client-side handler
async function* handleOpenAIClientSide(request: ChatRequest): AsyncGenerator<string> {
  const apiMessages = request.messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.content,
  }));

  if (request.systemPrompt) {
    const systemIndex = apiMessages.findIndex(m => m.role === 'system');
    if (systemIndex !== -1) {
      apiMessages[systemIndex].content = request.systemPrompt;
    } else {
      apiMessages.unshift({ role: 'system', content: request.systemPrompt });
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.modelId,
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("OpenAI response body is null");
  }

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
        if (dataJson === "[DONE]") return;
        
        try {
          const parsedData = JSON.parse(dataJson);
          const choice = parsedData.choices?.[0];
          
          if (choice?.delta?.content) {
            yield choice.delta.content;
          }
          
          if (choice?.finish_reason === "stop") return;
        } catch (e) {
          console.error("Error parsing OpenAI SSE event:", e);
        }
      }
    }
  }
}

// Anthropic client-side handler
async function* handleAnthropicClientSide(request: ChatRequest): AsyncGenerator<string> {
  const filteredMessages = request.messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
  const apiMessages = filteredMessages.map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': request.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: request.modelId,
      max_tokens: 2048,
      messages: apiMessages,
      stream: true,
      ...(request.systemPrompt && { system: request.systemPrompt }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Anthropic response body is null");
  }

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
        if (dataJson === "[DONE]") return;
        
        try {
          const parsedData = JSON.parse(dataJson);
          
          if (parsedData.type === 'content_block_delta' && parsedData.delta?.type === 'text_delta') {
            yield parsedData.delta.text;
          }
          
          if (parsedData.type === 'message_stop') return;
        } catch (e) {
          console.error("Error parsing Anthropic SSE event:", e);
        }
      }
    }
  }
}

// Gemini client-side handler (non-streaming for simplicity)
async function* handleGeminiClientSide(request: ChatRequest): AsyncGenerator<string> {
  const geminiMessages = request.messages
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

  const payload = {
    contents: geminiMessages.length > 0 ? geminiMessages : [{ parts: [{ text: "Hello" }] }],
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
    ...(request.systemPrompt && { 
      systemInstruction: { 
        parts: [{ text: request.systemPrompt }] 
      } 
    }),
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.modelId}:generateContent?key=${request.apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
  }

  const responseData = await response.json();
  
  if (responseData.candidates && responseData.candidates.length > 0) {
    const candidate = responseData.candidates[0];
    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      const text = candidate.content.parts[0].text;
      if (text) {
        // Simulate streaming
        const words = text.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = i === 0 ? words[i] : ' ' + words[i];
          yield chunk;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
  }
}

// Deepseek client-side handler
async function* handleDeepseekClientSide(request: ChatRequest): AsyncGenerator<string> {
  const apiMessages = request.messages.map(msg => ({
    role: msg.role === 'model' ? 'assistant' : msg.role,
    content: msg.content,
  }));

  if (request.systemPrompt) {
    const systemIndex = apiMessages.findIndex(m => m.role === 'system');
    if (systemIndex !== -1) {
      apiMessages[systemIndex].content = request.systemPrompt;
    } else {
      apiMessages.unshift({ role: 'system', content: request.systemPrompt });
    }
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.modelId,
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Deepseek API error: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Deepseek response body is null");
  }

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
        if (dataJson === "[DONE]") return;
        
        try {
          const parsedData = JSON.parse(dataJson);
          const choice = parsedData.choices?.[0];
          
          if (choice?.delta?.content) {
            yield choice.delta.content;
          }
          
          if (choice?.finish_reason === "stop") return;
        } catch (e) {
          console.error("Error parsing Deepseek SSE event:", e);
        }
      }
    }
  }
}

// Qwen client-side handler
async function* handleQwenClientSide(request: ChatRequest): AsyncGenerator<string> {
  const qwenMessages = request.messages
    .filter(msg => msg.role !== 'model')
    .map(msg => ({ role: msg.role, content: msg.content }));

  if (request.systemPrompt) {
    const systemIndex = qwenMessages.findIndex(m => m.role === 'system');
    if (systemIndex !== -1) {
      qwenMessages[systemIndex].content = request.systemPrompt;
    } else {
      qwenMessages.unshift({ role: 'system', content: request.systemPrompt });
    }
  }

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.modelId,
      messages: qwenMessages,
      stream: true,
      // Enable thinking for specific models that support it
      ...(request.modelId.includes('qwen-plus-latest') || 
          request.modelId.includes('qwen-turbo-latest') || 
          request.modelId.includes('qwen-plus-2025') ? 
        { enable_thinking: true } : {})
    }),
  });

  if (!response.ok) {
    throw new Error(`Qwen API error: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error("Qwen response body is null");
  }

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
        if (dataJson === "[DONE]") return;
        
        try {
          const parsedData = JSON.parse(dataJson);
          const choice = parsedData.choices?.[0];
          
          if (choice?.delta?.content) {
            yield choice.delta.content;
          }
          
          // Handle thinking content for models that support it
          if (choice?.delta?.reasoning_content) {
            yield `__THINKING_START__${choice.delta.reasoning_content}__THINKING_END__`;
          }
          
          if (choice?.finish_reason === "stop") return;
        } catch (e) {
          console.error("Error parsing Qwen SSE event:", e);
        }
      }
    }
  }
}

// Main client-side chat handler
export async function* handleChatClientSide(request: ChatRequest): AsyncGenerator<string> {
  const modelId = request.modelId.toLowerCase();
  
  if (modelId.startsWith('gpt')) {
    yield* handleOpenAIClientSide(request);
  } else if (modelId.startsWith('claude')) {
    yield* handleAnthropicClientSide(request);
  } else if (modelId.startsWith('gemini')) {
    yield* handleGeminiClientSide(request);
  } else if (modelId.startsWith('qwen') || modelId.startsWith('qwq') || modelId.includes('deepseek-r1')) {
    yield* handleQwenClientSide(request);
  } else if (modelId.startsWith('deepseek')) {
    yield* handleDeepseekClientSide(request);
  } else {
    throw new Error(`Client-side handler not implemented for model: ${request.modelId}`);
  }
}

// Unified chat handler that always uses client-side handlers
export async function* handleChat(request: ChatRequest): AsyncGenerator<string> {
  yield* handleChatClientSide(request);
} 