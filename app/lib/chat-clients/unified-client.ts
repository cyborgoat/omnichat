import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

// Unified client-side handler that routes to server-side endpoints
export async function* handleUnifiedClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController();
  const { setCurrentAbortController, proxySettings, modelSettings } = useChatStore.getState();
  setCurrentAbortController(controller);

  try {
    // Find the provider for this model
    const { availableModels, customModels } = useChatStore.getState();
    const allModels = [...availableModels, ...customModels];
    const model = allModels.find(m => m.id === request.modelId);
    
    if (!model) {
      throw new Error(`Model "${request.modelId}" not found in available models`);
    }

    // Determine the API endpoint based on provider
    let apiEndpoint: string;
    switch (model.provider) {
      case "OpenAI":
        apiEndpoint = "/api/chat/openai";
        break;
      case "Google":
        apiEndpoint = "/api/chat/gemini";
        break;
      case "Anthropic":
        apiEndpoint = "/api/chat/anthropic";
        break;
      case "Deepseek":
        apiEndpoint = "/api/chat/deepseek";
        break;
      case "Qwen":
        apiEndpoint = "/api/chat/qwen";
        break;
      case "Volces":
        apiEndpoint = "/api/chat/volces";
        break;
      case "Custom":
        apiEndpoint = "/api/chat/custom";
        break;
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }

    // Ensure we have a valid API key
    if (!request.apiKey || request.apiKey.trim() === "") {
      throw new Error(`${model.provider} API key is required but not provided`);
    }

    // Prepare the request body for our API route
    const requestBody: Record<string, unknown> = {
      modelId: request.modelId,
      messages: request.messages,
      apiKey: request.apiKey.trim(),
      proxySettings,
      streamEnabled: modelSettings.streamEnabled,
      temperature: modelSettings.temperature,
      maxTokens: modelSettings.maxTokens,
      ...(request.systemPrompt &&
        request.systemPrompt.trim() && {
          systemPrompt: request.systemPrompt.trim(),
        }),
    };

    // Add custom configuration for custom models
    if (model.provider === "Custom" && model.customConfig) {
      requestBody.customConfig = model.customConfig;
    }

    console.log(`Making ${model.provider} API request via server route:`, apiEndpoint);
    if (proxySettings.enabled) {
      console.log("Using proxy settings:", { 
        enabled: proxySettings.enabled,
        hasHttp: !!proxySettings.http,
        hasHttps: !!proxySettings.https,
        hasSocks5: !!proxySettings.socks5
      });
    }

    // Use our server-side API route
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorMessage = `Server API error: ${response.status} ${response.statusText}`;
      
      try {
        const errorBody = await response.text();
        let parsedError;
        
        try {
          parsedError = JSON.parse(errorBody);
        } catch {
          parsedError = { message: errorBody };
        }
        
        if (parsedError?.error) {
          errorMessage = parsedError.error;
          if (parsedError?.details) {
            errorMessage += ` - ${parsedError.details}`;
          }
        } else if (errorBody) {
          errorMessage += ` - ${errorBody}`;
        }
      } catch (parseError) {
        console.error("Failed to parse error response:", parseError);
      }
      
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error("Server API response body is null");
    }

    if (modelSettings.streamEnabled) {
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from the buffer
          let lineEndIndex;
          while ((lineEndIndex = buffer.indexOf("\n")) >= 0) {
            const line = buffer.substring(0, lineEndIndex).trim();
            buffer = buffer.substring(lineEndIndex + 1);

            // Skip empty lines
            if (!line) continue;

            // Process Server-Sent Events format
            if (line.startsWith("data: ")) {
              const dataContent = line.substring(6).trim();
              
              // Handle end of stream
              if (dataContent === "[DONE]") {
                return;
              }

              try {
                const parsedData = JSON.parse(dataContent);

                // Handle errors in the stream
                if (parsedData.error) {
                  throw new Error(parsedData.error);
                }

                // Handle different provider response formats
                if (model.provider === "Anthropic") {
                  // Handle Anthropic event types - fix first chunk issue
                  if (parsedData.type === "content_block_delta") {
                    if (parsedData.delta?.type === "text_delta" && parsedData.delta?.text) {
                      yield parsedData.delta.text;
                    }
                  } else if (parsedData.type === "content_block_start") {
                    // IMPORTANT: This handles the first chunk that contains initial content
                    if (parsedData.content_block?.type === "text" && parsedData.content_block?.text) {
                      yield parsedData.content_block.text;
                    }
                  } else if (parsedData.type === "message_stop") {
                    return;
                  }
                } else if (model.provider === "Google") {
                  // Handle Gemini response format - simple, no artificial thinking detection
                  if (parsedData.candidates && parsedData.candidates.length > 0) {
                    const candidate = parsedData.candidates[0];
                    if (candidate.content && candidate.content.parts) {
                      for (const part of candidate.content.parts) {
                        if (part.text) {
                          // Simply yield the text content without artificial processing
                          yield part.text;
                        }
                      }
                    }
                  }
                } else if (model.provider === "Custom") {
                  // Handle custom model response format
                  if (parsedData.thinking_content) {
                    yield `__THINKING_START__${parsedData.thinking_content}__THINKING_END__`;
                  }
                  if (parsedData.content) {
                    yield parsedData.content;
                  }
                } else {
                  // Handle OpenAI-compatible format (OpenAI, Deepseek, Qwen, Volces)
                  if (parsedData.choices && parsedData.choices.length > 0) {
                    const choice = parsedData.choices[0];
                    
                    // Handle reasoning content first - unified approach for all OpenAI-compatible providers
                    if (choice.delta && choice.delta.reasoning_content) {
                      // Ensure thinking content is yielded immediately
                      yield `__THINKING_START__${choice.delta.reasoning_content}__THINKING_END__`;
                    }
                    
                    // Handle regular content
                    if (choice.delta && choice.delta.content) {
                      yield choice.delta.content;
                    }
                  }
                }
              } catch (parseError) {
                console.error("Error parsing SSE event:", parseError, "Raw data:", dataContent);
                // For non-critical parse errors, continue processing
                if (dataContent.toLowerCase().includes("error") || 
                    dataContent.toLowerCase().includes("failed")) {
                  throw new Error(`Stream parsing error: ${dataContent.slice(0, 100)}`);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      // Handle non-streaming response
      const responseData = await response.json();
      
      if (model.provider === "Anthropic") {
        // Handle Anthropic non-streaming response
        if (responseData.content && responseData.content.length > 0) {
          for (const contentBlock of responseData.content) {
            if (contentBlock.type === "text" && contentBlock.text) {
              yield contentBlock.text;
            }
          }
        }
      } else if (model.provider === "Google") {
        // Handle Gemini non-streaming response - simple, no artificial thinking detection
        if (responseData.candidates && responseData.candidates.length > 0) {
          const candidate = responseData.candidates[0];
          if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
            for (const part of candidate.content.parts) {
              if (part.text) {
                // Simply yield the text content without artificial processing
                yield part.text;
              }
            }
          }
        }
      } else if (model.provider === "Custom") {
        // Handle custom model non-streaming response
        if (responseData.thinking) {
          yield `__THINKING_START__${responseData.thinking}__THINKING_END__`;
        }
        if (responseData.content) {
          yield responseData.content;
        }
      } else {
        // Handle OpenAI-compatible non-streaming response
        if (responseData.choices && responseData.choices.length > 0) {
          const messageContent = responseData.choices[0].message?.content;
          if (messageContent) {
            yield messageContent;
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.log("Request aborted by user");
      return;
    }
    console.error("Unified client error:", error);
    throw error;
  } finally {
    // Clean up abort controller
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
} 