import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { ProxySettings } from "@/app/store/chatStore";

// ChatMessage interface for OpenAI-compatible API
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CustomRequestBody {
  modelId: string;
  messages: ChatMessage[];
  systemPrompt?: string;
  apiKey?: string;
  customConfig: {
    apiEndpoint: string;
    modelName: string;
    supportsStreaming?: boolean;
    supportsThinking?: boolean;
    thinkingParameterName?: string;
    headers?: Record<string, string>;
  };
  proxySettings?: ProxySettings;
  streamEnabled?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: CustomRequestBody = await req.json();
    const {
      messages,
      systemPrompt,
      apiKey,
      customConfig,
      proxySettings,
      streamEnabled = true,
      temperature = 0.7,
      maxTokens = 4096,
    } = body;

    if (!customConfig?.apiEndpoint || !customConfig?.modelName) {
      return NextResponse.json(
        { error: "Custom model configuration is incomplete" },
        { status: 400 }
      );
    }

    console.log("Custom API request:", {
      endpoint: customConfig.apiEndpoint,
      model: customConfig.modelName,
      hasApiKey: !!apiKey,
      proxyEnabled: proxySettings?.enabled,
      streaming: streamEnabled && customConfig.supportsStreaming !== false
    });

    // Prepare messages array with system prompt
    const apiMessages = [...messages];
    if (systemPrompt && systemPrompt.trim()) {
      apiMessages.unshift({
        role: "system",
        content: systemPrompt,
      });
    }

    // Prepare request body for OpenAI-compatible API
    const requestBody: Record<string, unknown> = {
      model: customConfig.modelName,
      messages: apiMessages,
      temperature,
      max_tokens: maxTokens,
      stream: streamEnabled && customConfig.supportsStreaming !== false,
    };

    // Add thinking support if enabled
    if (customConfig.supportsThinking) {
      const thinkingParam = customConfig.thinkingParameterName || 'enable_thinking';
      requestBody[thinkingParam] = true;
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customConfig.headers,
    };

    if (apiKey && apiKey.trim()) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const apiEndpoint = customConfig.apiEndpoint.replace(/\/$/, '') + '/v1/chat/completions';

    // Handle proxy settings
    if (proxySettings?.enabled) {
      return handleProxyRequest(apiEndpoint, requestBody, headers, proxySettings);
    }

    // Direct request
    let response;
    try {
      console.log("Making request to:", apiEndpoint);
      response = await fetch(apiEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response error:", response.status, response.statusText, errorText);
        return NextResponse.json(
          { error: `Custom API error: ${response.status} ${response.statusText}`, details: errorText },
          { status: response.status }
        );
      }
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to custom API endpoint", details: fetchError instanceof Error ? fetchError.message : "Unknown error" },
        { status: 500 }
      );
    }

    if (streamEnabled && customConfig.supportsStreaming !== false) {
      return new Response(
        new ReadableStream({
          async start(controller) {
            const reader = response.body?.getReader();
            if (!reader) {
              controller.close();
              return;
            }

            const decoder = new TextDecoder();
            
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') {
                      continue;
                    }
                    
                    try {
                      const parsed = JSON.parse(data);
                      const delta = parsed.choices?.[0]?.delta;
                      
                      if (delta) {
                        // Handle thinking content - support multiple parameter names
                        let thinkingContent = null;
                        
                        // Check for various thinking parameter names
                        if (delta.thinking) {
                          thinkingContent = delta.thinking;
                        } else if (delta.reasoning_content) {
                          thinkingContent = delta.reasoning_content;
                        } else if (delta.reasoning) {
                          thinkingContent = delta.reasoning;
                        } else if (customConfig.thinkingParameterName && delta[customConfig.thinkingParameterName]) {
                          thinkingContent = delta[customConfig.thinkingParameterName];
                        }
                        
                        if (thinkingContent) {
                          const thinkingChunk = JSON.stringify({
                            thinking_content: thinkingContent,
                            done: false,
                          }) + '\n\n';
                          controller.enqueue(new TextEncoder().encode(`data: ${thinkingChunk}`));
                        }
                        
                        // Handle regular content
                        if (delta.content) {
                          const contentChunk = JSON.stringify({
                            content: delta.content,
                            done: false,
                          }) + '\n\n';
                          controller.enqueue(new TextEncoder().encode(`data: ${contentChunk}`));
                        }
                      }
                    } catch {
                      // Skip invalid JSON chunks
                      continue;
                    }
                  }
                }
              }
              
              // Send completion signal
              const doneChunk = JSON.stringify({ done: true }) + '\n\n';
              controller.enqueue(new TextEncoder().encode(`data: ${doneChunk}`));
              controller.close();
              
            } catch (error) {
              const errorChunk = JSON.stringify({
                error: error instanceof Error ? error.message : "Streaming error",
                done: true,
              }) + '\n\n';
              controller.enqueue(new TextEncoder().encode(`data: ${errorChunk}`));
              controller.close();
            }
          },
        }),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    } else {
      // Non-streaming response
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Handle thinking content - support multiple parameter names
      let thinking = "";
      const message = data.choices?.[0]?.message;
      if (message) {
        if (message.thinking) {
          thinking = message.thinking;
        } else if (message.reasoning_content) {
          thinking = message.reasoning_content;
        } else if (message.reasoning) {
          thinking = message.reasoning;
        } else if (customConfig.thinkingParameterName && message[customConfig.thinkingParameterName]) {
          thinking = message[customConfig.thinkingParameterName];
        }
      }

      return NextResponse.json({
        content,
        thinking,
        done: true,
      });
    }

  } catch (error) {
    console.error("Custom chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
  }

async function handleProxyRequest(
  apiEndpoint: string,
  requestBody: Record<string, unknown>,
  headers: Record<string, string>,
  proxySettings: ProxySettings
) {
  
  return new Promise<NextResponse>((resolve) => {
    const curlArgs = [
      "-X", "POST",
      "-H", "Content-Type: application/json",
      "-d", JSON.stringify(requestBody),
      apiEndpoint,
    ];

    // Add custom headers
    Object.entries(headers).forEach(([key, value]) => {
      if (key !== "Content-Type") {
        curlArgs.push("-H", `${key}: ${value}`);
      }
    });

    // Add proxy configuration
    if (proxySettings.socks5) {
      curlArgs.push("--socks5", proxySettings.socks5);
    } else if (proxySettings.https) {
      curlArgs.push("--proxy", proxySettings.https);
    } else if (proxySettings.http) {
      curlArgs.push("--proxy", proxySettings.http);
    }

    const curl = spawn("curl", curlArgs);
    let responseData = "";
    let errorData = "";

    curl.stdout.on("data", (data: Buffer) => {
      responseData += data.toString();
    });

    curl.stderr.on("data", (data: Buffer) => {
      errorData += data.toString();
    });

    curl.on("close", (code: number) => {
      if (code !== 0) {
        resolve(NextResponse.json(
          { error: `Curl command failed: ${errorData}` },
          { status: 500 }
        ));
        return;
      }

      try {
        const data = JSON.parse(responseData);
        const content = data.choices?.[0]?.message?.content || "";
        
        // Handle thinking content - support multiple parameter names
        let thinking = "";
        const message = data.choices?.[0]?.message;
        if (message) {
          if (message.thinking) {
            thinking = message.thinking;
          } else if (message.reasoning_content) {
            thinking = message.reasoning_content;
          } else if (message.reasoning) {
            thinking = message.reasoning;
          }
          // Note: customConfig not available in this scope, would need to pass it if needed
        }

        resolve(NextResponse.json({
          content,
          thinking,
          done: true,
        }));
      } catch {
        resolve(NextResponse.json(
          { error: "Failed to parse custom API response" },
          { status: 500 }
        ));
      }
    });
  });
} 