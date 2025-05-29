import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore"; // Import the store

// OpenAI client-side handler
export async function* handleOpenAIClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController(); // Create controller
  // Get the action from the store synchronously before any async operations
  const { setCurrentAbortController, modelSettings } = useChatStore.getState();
  setCurrentAbortController(controller); // Set it in the store

  try {
    const openaiMessages = request.messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({ role: msg.role as "user" | "assistant", content: msg.content }));

    if (request.systemPrompt) {
      openaiMessages.unshift({ role: "system" as "user", content: request.systemPrompt });
    }

    const payload = {
      model: request.modelId,
      messages: openaiMessages,
      stream: modelSettings.streamEnabled,
      temperature: modelSettings.temperature,
      max_tokens: modelSettings.maxTokens,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal, // Pass signal to fetch
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText} - ${errorBody.error?.message || JSON.stringify(errorBody)}`
      );
    }

    if (modelSettings.streamEnabled) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let lineEndIndex;
        while ((lineEndIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.substring(0, lineEndIndex).trim();
          buffer = buffer.substring(lineEndIndex + 1);

          if (line.startsWith("data: ")) {
            const dataContent = line.substring(6);
            if (dataContent === "[DONE]") {
              return;
            }

            try {
              const parsedData = JSON.parse(dataContent);
              if (parsedData.choices && parsedData.choices.length > 0) {
                const choice = parsedData.choices[0];
                if (choice.delta && choice.delta.content) {
                  yield choice.delta.content;
                }
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
            }
          }
        }
      }
    } else {
      // Non-streaming response
      const responseData = await response.json();
      if (responseData.choices && responseData.choices.length > 0) {
        const messageContent = responseData.choices[0].message?.content;
        if (messageContent) {
          yield messageContent;
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log("Fetch aborted by user (OpenAI).");
      // The store's controller is also cleared by stopCurrentGeneration.
      return; // Gracefully exit the generator
    }
    throw error; // Re-throw other errors
  } finally {
    // Clear the controller from the store if it's the one we set
    // and hasn't been cleared by stopCurrentGeneration already
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
}
