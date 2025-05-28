import { ChatRequest } from "./types";

// Anthropic client-side handler
export async function* handleAnthropicClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const filteredMessages = request.messages.filter(
    (msg) => msg.role === "user" || msg.role === "assistant"
  );
  const apiMessages = filteredMessages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": request.apiKey,
      "anthropic-version": "2023-06-01",
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
    const errorBody = await response.json().catch(() => response.text());
    const errorMessage =
      typeof errorBody === "string"
        ? errorBody
        : errorBody?.error?.message || JSON.stringify(errorBody);
    throw new Error(
      `Anthropic API error: ${response.status} ${response.statusText} - ${errorMessage}`
    );
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
    while ((eolIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.substring(0, eolIndex);
      buffer = buffer.substring(eolIndex + 1);

      if (line.startsWith("data: ")) {
        const dataJson = line.substring(6).trim();
        if (dataJson === "[DONE]") return;

        try {
          const parsedData = JSON.parse(dataJson);

          if (
            parsedData.type === "content_block_delta" &&
            parsedData.delta?.type === "text_delta"
          ) {
            yield parsedData.delta.text;
          }

          if (parsedData.type === "message_stop") return;
        } catch (e) {
          console.error("Error parsing Anthropic SSE event:", e);
        }
      }
    }
  }
}
