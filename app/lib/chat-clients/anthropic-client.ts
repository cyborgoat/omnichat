import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

// Valid Anthropic model IDs based on official documentation
const VALID_ANTHROPIC_MODELS = [
  "claude-opus-4-20250514",
  "claude-sonnet-4-20250514",
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-5-haiku-20241022",
];

// Anthropic client-side handler
export async function* handleAnthropicClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController();
  const { setCurrentAbortController, proxySettings } = useChatStore.getState();
  setCurrentAbortController(controller);

  try {
    // Validate model ID
    if (!VALID_ANTHROPIC_MODELS.includes(request.modelId)) {
      console.warn(
        `Model ID "${request.modelId}" may not be valid for Anthropic API. Valid models:`,
        VALID_ANTHROPIC_MODELS
      );
    }

    // Filter and format messages for Anthropic API
    const filteredMessages = request.messages.filter(
      (msg) => msg.role === "user" || msg.role === "assistant"
    );

    // Validate we have messages
    if (filteredMessages.length === 0) {
      throw new Error("No valid messages found for Anthropic API request");
    }

    // Ensure we have a valid API key
    if (!request.apiKey || request.apiKey.trim() === "") {
      throw new Error("Anthropic API key is required but not provided");
    }

    // Prepare the request body for our API route
    const requestBody = {
      modelId: request.modelId,
      messages: filteredMessages,
      apiKey: request.apiKey.trim(),
      proxySettings,
      ...(request.systemPrompt &&
        request.systemPrompt.trim() && {
          systemPrompt: request.systemPrompt.trim(),
        }),
    };

    console.log("Making Anthropic API request via server route with model:", request.modelId);
    if (proxySettings.enabled) {
      console.log("Using proxy settings:", { 
        enabled: proxySettings.enabled,
        hasHttp: !!proxySettings.http,
        hasHttps: !!proxySettings.https,
        hasSocks5: !!proxySettings.socks5
      });
    }

    // Use our server-side API route instead of calling Anthropic directly
    const response = await fetch("/api/chat/anthropic", {
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

              // Handle content block delta events (text streaming)
              if (
                parsedData.type === "content_block_delta" &&
                parsedData.delta?.type === "text_delta" &&
                parsedData.delta?.text
              ) {
                yield parsedData.delta.text;
              }

              // Handle message stop event
              if (parsedData.type === "message_stop") {
                return;
              }

              // Log other event types for debugging
              if (
                parsedData.type &&
                ![
                  "content_block_start",
                  "content_block_delta",
                  "content_block_stop",
                  "message_delta",
                ].includes(parsedData.type)
              ) {
                console.log(
                  "Anthropic SSE event:",
                  parsedData.type,
                  parsedData
                );
              }
            } catch (parseError) {
              console.error(
                "Error parsing Anthropic SSE event:",
                parseError,
                "Raw data:",
                dataContent
              );
              // Continue processing other events instead of throwing
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.log("Anthropic request aborted by user");
      return;
    }
    console.error("Anthropic API error:", error);
    throw error;
  } finally {
    // Clean up abort controller
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
}
