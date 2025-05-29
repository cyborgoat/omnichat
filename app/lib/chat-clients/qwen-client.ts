import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

// Qwen client-side handler using OpenAI-compatible endpoint
export async function* handleQwenClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController();
  const { setCurrentAbortController, modelSettings } = useChatStore.getState();
  setCurrentAbortController(controller);

  // Qwen3 models that explicitly support enable_thinking
  const qwen3ThinkingModels = [
    "qwen-plus-latest", 
    "qwen-plus-2025-04-28", 
    "qwen-turbo-latest"
  ];
  const isQwen3ThinkingModel = qwen3ThinkingModels.includes(request.modelId);

  try {
    const qwenMessages = request.messages
      .filter((msg) => msg.role === "user" || msg.role === "assistant" || msg.role === "system")
      .map((msg) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      }));

    // Ensure system prompt is the first message if provided
    if (request.systemPrompt) {
      const systemMsgIndex = qwenMessages.findIndex(msg => msg.role === "system");
      if (systemMsgIndex !== -1) {
        qwenMessages[systemMsgIndex].content = request.systemPrompt;
      } else {
        qwenMessages.unshift({ role: "system", content: request.systemPrompt });
      }
    }
    
    // Add a prompt to encourage thinking if it's a Qwen3 model and streaming is on
    // This is an attempt to trigger thinking via prompting, as enable_thinking is not standard OpenAI param
    if (isQwen3ThinkingModel && modelSettings.streamEnabled && !qwenMessages.find(m => m.role === "system" && m.content.includes("Please show your thinking process step by step before the final answer."))) {
        qwenMessages.unshift({
            role: "system",
            content: "Please show your thinking process step by step before the final answer. Format the thinking process within <think>...</think> blocks."
        });
    }


    const payload = {
      model: request.modelId,
      messages: qwenMessages,
      stream: modelSettings.streamEnabled, // Crucial for thinking mode on Qwen3
      temperature: modelSettings.temperature,
      max_tokens: 4096, // Default, can be adjusted
      // The `enable_thinking` parameter is not standard OpenAI and likely ignored by compatible endpoint.
      // We rely on prompt engineering above for Qwen3 models.
    };

    const url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => response.text());
      const errorMessage = typeof errorBody === "string" 
        ? errorBody 
        : errorBody?.error?.message || JSON.stringify(errorBody);
      throw new Error(
        `Qwen API error: ${response.status} ${response.statusText} - ${errorMessage}`
      );
    }

    if (modelSettings.streamEnabled) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let isInThinkingBlock = false;
      let thinkingContentAccumulator = "";

      if (!reader) {
        throw new Error("Response body is not readable for streaming.");
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
              if (isInThinkingBlock && thinkingContentAccumulator) {
                 // If stream ends mid-thought, yield what we have.
                 yield `__THINKING_START__\n${thinkingContentAccumulator.replace(/<\/?think>/gi, "").trim()}\n__THINKING_END__\n`;
              }
              return;
            }
            
            try {
              const parsedData = JSON.parse(dataContent);
              if (parsedData.choices && parsedData.choices.length > 0) {
                const choice = parsedData.choices[0];
                const currentContent = choice.delta?.content || "";
                const finishReason = choice.finish_reason;

                // Attempt to parse <think>...</think> blocks from currentContent
                let partStartIndex = 0;
                while(partStartIndex < currentContent.length) {
                    if (!isInThinkingBlock) {
                        const thinkStartMarker = "<think>";
                        const thinkStartIndex = currentContent.indexOf(thinkStartMarker, partStartIndex);

                        if (thinkStartIndex !== -1) {
                            // Yield content before <think>
                            if (thinkStartIndex > partStartIndex) {
                                yield currentContent.substring(partStartIndex, thinkStartIndex);
                            }
                            isInThinkingBlock = true;
                            thinkingContentAccumulator = ""; // Reset accumulator
                            partStartIndex = thinkStartIndex + thinkStartMarker.length;
                        } else {
                            // No <think> found, yield remaining content
                            yield currentContent.substring(partStartIndex);
                            partStartIndex = currentContent.length;
                        }
                    }

                    if (isInThinkingBlock) {
                        const thinkEndMarker = "</think>";
                        const thinkEndIndex = currentContent.indexOf(thinkEndMarker, partStartIndex);

                        if (thinkEndIndex !== -1) {
                            thinkingContentAccumulator += currentContent.substring(partStartIndex, thinkEndIndex);
                            yield `__THINKING_START__\n${thinkingContentAccumulator.replace(/<\/?think>/gi, "").trim()}\n__THINKING_END__\n`;
                            isInThinkingBlock = false;
                            thinkingContentAccumulator = "";
                            partStartIndex = thinkEndIndex + thinkEndMarker.length;
                        } else {
                            // No </think> found in this chunk, accumulate content
                            thinkingContentAccumulator += currentContent.substring(partStartIndex);
                            partStartIndex = currentContent.length;
                        }
                    }
                }

                if (finishReason === "stop") {
                  if (isInThinkingBlock && thinkingContentAccumulator) {
                     // If stream stops mid-thought, yield what we have.
                     yield `__THINKING_START__\n${thinkingContentAccumulator.replace(/<\/?think>/gi, "").trim()}\n__THINKING_END__\n`;
                  }
                  return;
                }
              }
            } catch (parseError) {
              console.error("Error parsing Qwen SSE data:", parseError, "Raw data:", dataContent);
            }
          }
        }
      }
    } else {
      // Non-streaming response (OpenAI-compatible format)
      const responseData = await response.json();
      if (responseData.choices && responseData.choices.length > 0) {
        const messageContent = responseData.choices[0].message?.content || "";
        
        // Process <think>...</think> blocks for non-streaming
        const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
        let lastIndex = 0;
        let match;
        let combinedOutput = "";

        while ((match = thinkRegex.exec(messageContent)) !== null) {
          if (match.index > lastIndex) {
            combinedOutput += messageContent.substring(lastIndex, match.index);
          }
          combinedOutput += `__THINKING_START__\n${match[1].trim()}\n__THINKING_END__\n`;
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < messageContent.length) {
          combinedOutput += messageContent.substring(lastIndex);
        }
        if (combinedOutput) yield combinedOutput;
      }
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.log("Fetch aborted by user (Qwen).");
      return;
    }
    console.error("Qwen client error:", error);
    throw error;
  } finally {
    if (useChatStore.getState().currentAbortController === controller) {
      setCurrentAbortController(null);
    }
  }
}
