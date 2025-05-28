import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

// Volces (Volcengine) client-side handler
export async function* handleVolcesClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController();
  const { setCurrentAbortController } = useChatStore.getState();
  setCurrentAbortController(controller);

  try {
    const apiMessages = request.messages.map((msg) => ({
      role: msg.role === "model" ? "assistant" : msg.role,
      content: msg.content,
    }));

    if (request.systemPrompt) {
      const systemIndex = apiMessages.findIndex((m) => m.role === "system");
      if (systemIndex !== -1) {
        apiMessages[systemIndex].content = request.systemPrompt;
      } else {
        apiMessages.unshift({ role: "system", content: request.systemPrompt });
      }
    }

    // Note: The endpoint URL might need to be verified from Volcengine documentation.
    // Using a common pattern for OpenAI-compatible APIs.
    const response = await fetch(
      "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: JSON.stringify({
          model: request.modelId, // Should be 'deepseek-r1' or 'deepseek-v3'
          messages: apiMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2048, // Adjust as needed
        }),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => response.text());
      const errorMessage =
        typeof errorBody === "string"
          ? errorBody
          : errorBody?.error?.message || JSON.stringify(errorBody);
      throw new Error(
        `Volces API error: ${response.status} ${response.statusText} - ${errorMessage}`
      );
    }

    if (!response.body) {
      throw new Error("Volces response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });
      }

      let eolIndex;
      while ((eolIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.substring(0, eolIndex).trim();
        buffer = buffer.substring(eolIndex + 1);

        if (line.startsWith("data: ")) {
          const dataJson = line.substring(6).trim();
          if (dataJson === "[DONE]") return;
          if (!dataJson) continue;

          try {
            const parsedData = JSON.parse(dataJson);
            const choice = parsedData.choices?.[0];

            if (choice?.delta?.content) {
              yield choice.delta.content;
            }

            // Handle reasoning content for Volces models
            if (choice?.delta?.reasoning_content) {
              yield `__THINKING_START__${choice.delta.reasoning_content}__THINKING_END__`;
            }

            if (choice?.finish_reason === "stop") return;
          } catch (e) {
            console.error(
              "Error parsing Volces SSE event:",
              e,
              "Raw line:",
              line
            );
          }
        }
      }
      if (done) break;
    }

    // Process any remaining data in the buffer after the stream is done
    if (buffer.trim()) {
      const lines = buffer.split('\n'); 
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("data: ")) {
          const dataJson = trimmedLine.substring(6).trim();
          if (dataJson === "[DONE]") return; 
          if (!dataJson) continue;

          try {
            const parsedData = JSON.parse(dataJson);
            const choice = parsedData.choices?.[0];
            if (choice?.delta?.content) {
              yield choice.delta.content;
            }
            if (choice?.delta?.reasoning_content) {
              yield `__THINKING_START__${choice.delta.reasoning_content}__THINKING_END__`;
            }
            if (choice?.finish_reason === "stop") return;
          } catch (e) {
            console.error("Error parsing final Volces SSE event from buffer:", e, "Raw data line:", dataJson);
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log("Fetch aborted by user (Volces).");
      return;
    }
    throw error;
  } finally {
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
}
