import { ChatRequest } from "./types";
import { useChatStore } from "@/app/store/chatStore";

// Gemini client-side handler with streaming support
export async function* handleGeminiClientSide(
  request: ChatRequest
): AsyncGenerator<string> {
  const controller = new AbortController();
  const { setCurrentAbortController, modelSettings } = useChatStore.getState();
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
        temperature: modelSettings.temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: modelSettings.maxTokens,
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

    // Use streaming endpoint if streaming is enabled
    const endpoint = modelSettings.streamEnabled 
      ? 'streamGenerateContent?alt=sse' 
      : 'generateContent';
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${request.modelId}:${endpoint}&key=${request.apiKey}`;

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

    if (modelSettings.streamEnabled) {
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines
        let lineEndIndex;
        while ((lineEndIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.substring(0, lineEndIndex).trim();
          buffer = buffer.substring(lineEndIndex + 1);
          
          if (!line || !line.startsWith('data: ')) continue;
          
          const data = line.substring(6);
          if (data === '[DONE]') return;
          
          try {
            const parsedData = JSON.parse(data);
            
            // Process the streaming response
            if (parsedData.candidates && parsedData.candidates.length > 0) {
              const candidate = parsedData.candidates[0];
              if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                  if (part.text) {
                    if (part.thought) {
                      yield `__THINKING_START__\n${part.text}\n__THINKING_END__\n`;
                    } else {
                      yield part.text;
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse streaming data:", e);
          }
        }
      }
    } else {
      // Non-streaming response (existing code)
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
