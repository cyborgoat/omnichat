import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

// Gemini client-side handler (non-streaming for simplicity)
export async function* handleGeminiClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController();
  const { setCurrentAbortController } = useChatStore.getState();
  setCurrentAbortController(controller);

  try {
    const geminiMessages = request.messages
      .filter(
        (msg) =>
          (msg.role === "user" || msg.role === "assistant") &&
          msg.content &&
          msg.content.trim() !== ""
      )
      .map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

    const payload = {
      contents:
        geminiMessages.length > 0
          ? geminiMessages
          : [{ parts: [{ text: "Hello" }] }],
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
        thinkingConfig: {
          includeThoughts: true,
        },
      },
      ...(request.systemPrompt && {
        systemInstruction: {
          parts: [{ text: request.systemPrompt }],
        },
      }),
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.modelId}:generateContent?key=${request.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => response.text());
      const errorMessage =
        typeof errorBody === "string"
          ? errorBody
          : errorBody?.error?.message || JSON.stringify(errorBody);
      throw new Error(
        `Gemini API error: ${response.status} ${response.statusText} - ${errorMessage}`
      );
    }

    const responseData = await response.json();

    if (responseData.candidates && responseData.candidates.length > 0) {
      const candidate = responseData.candidates[0];
      if (
        candidate.content &&
        candidate.content.parts &&
        candidate.content.parts.length > 0
      ) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            if (part.thought) {
              yield `__THINKING_START__\n${part.text}\n__THINKING_END__\n`;
            } else {
              // Yield the entire non-thought part text at once
              if (part.text && part.text.trim() !== "") {
                yield part.text;
              }
            }
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log("Fetch aborted by user (Gemini).");
      return;
    }
    throw error;
  } finally {
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
}
