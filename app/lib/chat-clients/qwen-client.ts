import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

// Qwen client-side handler
export async function* handleQwenClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController();
  const { setCurrentAbortController } = useChatStore.getState();
  setCurrentAbortController(controller);

  try {
    const qwenMessages = request.messages
      .filter((msg) => msg.role !== "model")
      .map((msg) => ({ role: msg.role, content: msg.content }));

    if (request.systemPrompt) {
      const systemIndex = qwenMessages.findIndex((m) => m.role === "system");
      if (systemIndex !== -1) {
        qwenMessages[systemIndex].content = request.systemPrompt;
      } else {
        qwenMessages.unshift({ role: "system", content: request.systemPrompt });
      }
    }

    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: JSON.stringify({
          model: request.modelId,
          messages: qwenMessages,
          stream: true,
          // Enable thinking for specific models that support it
          ...(request.modelId.includes("qwen-plus-latest") ||
          request.modelId.includes("qwen-turbo-latest") ||
          request.modelId.includes("qwen-plus-2025")
            ? { enable_thinking: true }
            : {}),
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
        `Qwen API error: ${response.status} ${response.statusText} - ${errorMessage}`
      );
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
      while ((eolIndex = buffer.indexOf("\n")) >= 0) {
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
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log("Fetch aborted by user (Qwen).");
      return;
    }
    throw error;
  } finally {
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
}
