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
      '--no-buffer',
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

    let buffer = '';
    let errorData = '';
    let hasStreamStarted = false;

    curlProcess.stdout.on('data', async (chunk) => {
      try {
        const data = chunk.toString();
        buffer += data;

        // Process complete lines from the buffer
        let lineEndIndex;
        while ((lineEndIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.substring(0, lineEndIndex).trim();
          buffer = buffer.substring(lineEndIndex + 1);

          // Skip empty lines
          if (!line) continue;

          // Check if this is an SSE data line
          if (line.startsWith('data: ')) {
            hasStreamStarted = true;
            // Forward the SSE line as-is to maintain proper format
            await writer.write(new TextEncoder().encode(line + '\n\n'));
          } else if (line.startsWith('event: ')) {
            // Forward event lines as well
            await writer.write(new TextEncoder().encode(line + '\n'));
          } else if (hasStreamStarted) {
            // If we've started streaming and encounter a non-SSE line, it might be error data
            try {
              const errorResponse = JSON.parse(line);
              if (errorResponse.error) {
                await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ error: errorResponse.error.message || 'API Error' })}\n\n`));
              }
            } catch {
              // If it's not JSON, treat as raw error
              console.error('Unexpected data from Anthropic API:', line);
            }
          }
        }
      } catch (error) {
        console.error('Error processing stdout data:', error);
      }
    });

    curlProcess.stderr.on('data', (chunk) => {
      errorData += chunk.toString();
    });

    curlProcess.on('close', async (code) => {
      try {
        if (code === 0) {
          // Send final SSE end marker
          if (hasStreamStarted) {
            await writer.write(new TextEncoder().encode('data: [DONE]\n\n'));
          }
          writer.close();
        } else {
          let errorMessage = 'Request failed';
          
          // Try to parse error from remaining buffer or stderr
          if (buffer.trim()) {
            try {
              const errorResponse = JSON.parse(buffer.trim());
              if (errorResponse.error?.message) {
                errorMessage = errorResponse.error.message;
              }
            } catch {
              errorMessage = buffer.trim().slice(0, 200);
            }
          } else if (errorData.trim()) {
            errorMessage = `Curl error: ${errorData.trim()}`;
          }
          
          await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ 
            error: errorMessage,
            details: errorData.trim()
          })}\n\n`));
          writer.close();
        }
      } catch (error) {
        console.error('Error in close handler:', error);
        writer.close();
      }
    });

    curlProcess.on('error', async (error) => {
      try {
        await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ 
          error: `Failed to execute curl: ${error.message}`,
          suggestion: "Make sure curl is installed and available in PATH"
        })}\n\n`));
        writer.close();
      } catch (writeError) {
        console.error('Error writing error message:', writeError);
        writer.close();
      }
    });

    return new NextResponse(readable, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
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