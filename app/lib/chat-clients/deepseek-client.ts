import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

// Deepseek client-side handler
export async function* handleDeepseekClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController();
  const { setCurrentAbortController, modelSettings } = useChatStore.getState();
  setCurrentAbortController(controller);

  try {
    const deepseekMessages = request.messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

    if (request.systemPrompt) {
      deepseekMessages.unshift({
        role: "system" as "user",
        content: request.systemPrompt,
      });
    }

    const payload = {
      model: request.modelId,
      messages: deepseekMessages,
      stream: modelSettings.streamEnabled,
      temperature: modelSettings.temperature,
    };

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(
        `Deepseek API error: ${response.status} ${response.statusText} - ${
          errorBody.error?.message || JSON.stringify(errorBody)
        }`
      );
    }

    if (modelSettings.streamEnabled) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let isInReasoningBlock = false;
      let reasoningContent = "";

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
                  const content = choice.delta.content;

                  // Detect reasoning blocks for models like deepseek-reasoner
                  if (content.includes("<Thought>")) {
                    isInReasoningBlock = true;
                    const startIdx = content.indexOf("<Thought>");
                    if (startIdx > 0) {
                      yield content.substring(0, startIdx);
                    }
                    reasoningContent = content.substring(startIdx);
                  } else if (content.includes("</Thought>")) {
                    const endIdx = content.indexOf("</Thought>") + 10;
                    reasoningContent += content.substring(0, endIdx);
                    isInReasoningBlock = false;

                    // Format and yield the reasoning content
                    yield `__THINKING_START__\n${reasoningContent.replace(/<\/?Thought>/g, "").trim()}\n__THINKING_END__\n`;

                    // Yield any content after the reasoning block
                    if (endIdx < content.length) {
                      yield content.substring(endIdx);
                    }
                    reasoningContent = "";
                  } else if (isInReasoningBlock) {
                    reasoningContent += content;
                  } else {
                    yield content;
                  }
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
          // Process reasoning blocks for non-streaming
          const thoughtRegex = /<Thought>([\s\S]*?)<\/Thought>/g;
          let lastIndex = 0;
          let match;

          while ((match = thoughtRegex.exec(messageContent)) !== null) {
            // Yield content before the thought block
            if (match.index > lastIndex) {
              yield messageContent.substring(lastIndex, match.index);
            }

            // Yield the thought content
            yield `__THINKING_START__\n${match[1].trim()}\n__THINKING_END__\n`;

            lastIndex = match.index + match[0].length;
          }

          // Yield any remaining content
          if (lastIndex < messageContent.length) {
            yield messageContent.substring(lastIndex);
          }
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.log("Fetch aborted by user (Deepseek).");
      return;
    }
    throw error;
  } finally {
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
}
