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

interface VolcesRequestBody {
  modelId: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  apiKey: string;
  proxySettings?: ProxySettings;
  streamEnabled?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: VolcesRequestBody = await request.json();
    const { modelId, messages, systemPrompt, apiKey, proxySettings, streamEnabled = true, temperature = 0.7, maxTokens = 4096 } = body;

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

    // Filter and format messages for Volces API
    const volcesMessages = messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    if (systemPrompt) {
      volcesMessages.unshift({
        role: "system" as "user",
        content: systemPrompt,
      });
    }

    // Validate messages
    if (volcesMessages.length === 0) {
      return NextResponse.json(
        { error: 'At least one non-empty message is required' },
        { status: 400 }
      );
    }

    // Prepare the request body
    const requestBody = {
      model: modelId,
      messages: volcesMessages,
      stream: streamEnabled,
      parameters: {
        temperature,
        max_new_tokens: maxTokens,
      },
    };

    // Volcengine API endpoint
    const url = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";

    // Build curl command
    const curlArgs = [
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Bearer ${apiKey}`,
      '-d', JSON.stringify(requestBody),
      '--silent',
      '--show-error',
      '--fail-with-body',
      '--no-buffer',
      url
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

    if (streamEnabled) {
      // Handle streaming response (existing code)
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
              
              // Validate that the data is properly formatted JSON
              const dataContent = line.substring(6).trim();
              if (dataContent === '[DONE]') {
                // Forward the end marker as-is
                await writer.write(new TextEncoder().encode(line + '\n\n'));
              } else {
                try {
                  // Validate JSON format before forwarding
                  JSON.parse(dataContent);
                  await writer.write(new TextEncoder().encode(line + '\n\n'));
                } catch {
                  console.error('Invalid JSON in SSE data from Volces:', dataContent);
                  // Skip malformed JSON data
                }
              }
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
                console.error('Unexpected data from Volces API:', line);
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
    } else {
      // Handle non-streaming response
      return new Promise<NextResponse>((resolve) => {
        curlProcess.stdout.on('data', (chunk) => {
          buffer += chunk.toString();
        });

        curlProcess.stderr.on('data', (chunk) => {
          errorData += chunk.toString();
        });

        curlProcess.on('close', (code) => {
          if (code === 0) {
            try {
              // Parse the complete response as JSON
              const responseData = JSON.parse(buffer);
              resolve(NextResponse.json(responseData));
            } catch (parseError) {
              console.error('Error parsing non-streaming response:', parseError);
              resolve(NextResponse.json(
                { error: 'Failed to parse API response', details: buffer.slice(0, 200) },
                { status: 500 }
              ));
            }
          } else {
            let errorMessage = 'Request failed';
            
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
            
            resolve(NextResponse.json(
              { error: errorMessage, details: errorData.trim() },
              { status: 500 }
            ));
          }
        });

        curlProcess.on('error', (error) => {
          resolve(NextResponse.json(
            { 
              error: `Failed to execute curl: ${error.message}`,
              suggestion: "Make sure curl is installed and available in PATH"
            },
            { status: 500 }
          ));
        });
      });
    }

  } catch (error) {
    console.error("Error in Volces API route:", error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 