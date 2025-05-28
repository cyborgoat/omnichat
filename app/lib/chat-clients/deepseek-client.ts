import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

interface DeepseekApiMessage {
  role: string;
  content: string;
}

interface DeepseekRequestBody {
  model: string;
  messages: DeepseekApiMessage[];
  stream: boolean;
  max_tokens: number;
  temperature?: number; // Optional temperature
}

// Deepseek client-side handler
export async function* handleDeepseekClientSide(
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

    // Note: deepseek-reasoner might not support temperature.
    // The docs say: "setting temperature, top_p, presence_penalty, frequency_penalty will not trigger an error but will also have no effect."
    // So, we can keep it for other deepseek models, it won't harm reasoner.
    const body: DeepseekRequestBody = {
      model: request.modelId,
      messages: apiMessages,
      stream: true,
      max_tokens: request.modelId === "deepseek-reasoner" ? 8192 : 2048, // Max for reasoner final answer is 8k, CoT is 32k (not controlled by this)
    };

    if (request.modelId !== "deepseek-reasoner") {
      body.temperature = 0.7;
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => response.text());
      const errorMessage =
        typeof errorBody === "string"
          ? errorBody
          : errorBody?.error?.message || JSON.stringify(errorBody);
      throw new Error(
        `Deepseek API error: ${response.status} ${response.statusText} - ${errorMessage}`
      );
    }

    if (!response.body) {
      throw new Error("Deepseek response body is null");
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
      while ((eolIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.substring(0, eolIndex).trim();
        buffer = buffer.substring(eolIndex + 1);

        if (line.startsWith("data: ")) {
          const dataJson = line.substring(6).trim();
          if (dataJson === "[DONE]") {
            return;
          }
          if (!dataJson) continue;

          try {
            const parsedData = JSON.parse(dataJson);
            const choice = parsedData.choices?.[0];

            if (choice?.delta?.reasoning_content) {
              yield `__THINKING_START__${choice.delta.reasoning_content}__THINKING_END__`;
            }
            if (choice?.delta?.content) {
              yield choice.delta.content;
            }

            if (choice?.finish_reason === "stop") {
              return;
            }
          } catch (e) {
            console.error(
              "Error parsing Deepseek SSE event:",
              e,
              "Raw line:",
              line
            );
          }
        }
      }
      if (done) break;
    }

    // Process any remaining data in the buffer
    if (buffer.trim()) {
      const lines = buffer.split("\n");
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("data: ")) {
          const dataJson = trimmedLine.substring(6).trim();
          if (dataJson === "[DONE]") {
            return;
          }
          if (!dataJson) continue;

          try {
            const parsedData = JSON.parse(dataJson);
            const choice = parsedData.choices?.[0];
            if (choice?.delta?.reasoning_content) {
              yield `__THINKING_START__${choice.delta.reasoning_content}__THINKING_END__`;
            }
            if (choice?.delta?.content) {
              yield choice.delta.content;
            }
            if (choice?.finish_reason === "stop") {
              return;
            }
          } catch (e) {
            console.error(
              "Error parsing final Deepseek SSE event from buffer:",
              e,
              "Raw data line:",
              dataJson
            );
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log("Fetch aborted by user (Deepseek).");
      return;
    }
    throw error;
  } finally {
    // No need to clear timeoutId as it was removed
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
}
