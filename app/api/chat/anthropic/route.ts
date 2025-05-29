import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

interface ProxySettings {
  enabled: boolean;
  http?: string;
  https?: string;
  socks5?: string;
}

interface AnthropicRequestBody {
  modelId: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  apiKey: string;
  proxySettings?: ProxySettings;
}

export async function POST(request: NextRequest) {
  try {
    const body: AnthropicRequestBody = await request.json();
    const { modelId, messages, systemPrompt, apiKey, proxySettings } = body;

    // Validate required fields
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Filter and format messages for Anthropic API
    const filteredMessages = messages
      .filter((msg: ChatMessage) => msg.role === "user" || msg.role === "assistant")
      .filter((msg: ChatMessage) => msg.content && msg.content.trim().length > 0);
    
    const apiMessages = filteredMessages.map((msg: ChatMessage) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content.trim(),
    }));

    // Validate messages
    if (apiMessages.length === 0) {
      return NextResponse.json(
        { error: 'At least one non-empty message is required' },
        { status: 400 }
      );
    }

    if (apiMessages[apiMessages.length - 1].role !== 'user') {
      return NextResponse.json(
        { error: 'The last message must be from the user' },
        { status: 400 }
      );
    }

    // Prepare the request body
    const requestBody = {
      model: modelId,
      max_tokens: 4096,
      messages: apiMessages,
      stream: true,
      ...(systemPrompt && systemPrompt.trim() && { 
        system: systemPrompt.trim() 
      }),
    };

    // Build curl command
    const curlArgs = [
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-H', `x-api-key: ${apiKey}`,
      '-H', 'anthropic-version: 2023-06-01',
      '-d', JSON.stringify(requestBody),
      '--silent',
      '--show-error',
      '--fail-with-body',
      'https://api.anthropic.com/v1/messages'
    ];

    // Add proxy configuration if enabled
    if (proxySettings?.enabled) {
      const proxyUrl = proxySettings.socks5 || proxySettings.https || proxySettings.http;
      if (proxyUrl) {
        curlArgs.splice(-1, 0, '--proxy', proxyUrl);
      }
    }

    // Create response stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Execute curl command
    const curlProcess = spawn('curl', curlArgs);

    let responseData = '';
    let errorData = '';

    curlProcess.stdout.on('data', (chunk) => {
      const data = chunk.toString();
      responseData += data;
      writer.write(new TextEncoder().encode(data));
    });

    curlProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString();
    });

    curlProcess.on('close', (code) => {
      if (code === 0) {
        writer.close();
      } else {
        let errorMessage = 'Request failed';
        
        if (responseData) {
          try {
            const errorResponse = JSON.parse(responseData);
            if (errorResponse.error?.message) {
              errorMessage = errorResponse.error.message;
            }
          } catch {
            errorMessage = responseData.slice(0, 200);
          }
        }
        
        writer.write(new TextEncoder().encode(JSON.stringify({ 
          error: errorMessage,
          details: errorData.trim()
        })));
        writer.close();
      }
    });

    curlProcess.on('error', (error) => {
      writer.write(new TextEncoder().encode(JSON.stringify({ 
        error: `Failed to execute curl: ${error.message}`,
        suggestion: "Make sure curl is installed and available in PATH"
      })));
      writer.close();
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error("Error in Anthropic API route:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 