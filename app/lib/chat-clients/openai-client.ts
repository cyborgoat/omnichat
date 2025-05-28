import { ChatRequest } from "./types";

// OpenAI client-side handler
export async function* handleOpenAIClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${request.apiKey}`,
    },
    body: JSON.stringify({
      model: request.modelId,
      messages: apiMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => response.text());
    const errorMessage =
      typeof errorBody === "string"
        ? errorBody
        : errorBody?.error?.message || JSON.stringify(errorBody);
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorMessage}`
    );
  }

  if (!response.body) {
    throw new Error("OpenAI response body is null");
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

          if (choice?.finish_reason === "stop") return;
        } catch (e) {
          console.error("Error parsing OpenAI SSE event:", e);
        }
      }
    }
  }
}
