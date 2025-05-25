"use client"; // Required for useState and event handlers

import {v4 as uuidv4} from "uuid";
import {useEffect, useRef} from "react";
import MessageList from "../chat/MessageList";
import ChatInput from "../chat/ChatInput";
import {Message, useActiveChatSession, useChatStore,} from "@/app/store/chatStore";
import {WelcomeScreen} from "../chat/WelcomeScreen";

export default function ChatScreen() {
  const store = useChatStore(); // Get the whole store for easier access to multiple states/actions
  const activeSession = useActiveChatSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, store.isBotThinking]);

  useEffect(() => {
    if (!store.activeChatSessionId && store.chatSessions.length > 0) {
      store.setActiveChatSession(store.chatSessions[0].id);
    } else if (
      store.chatSessions.length === 0 &&
      useChatStore.persist.hasHydrated()
    ) {
      // This case is handled by the store subscription now.
    }
  }, [
    store.activeChatSessionId,
    store.chatSessions,
    store.setActiveChatSession,
  ]);

  const handleSendMessage = async (messageText: string, files?: File[]) => {
    if (!activeSession) {
      console.error("No active chat session to send message.");
      return;
    }
    if (!messageText.trim() && (!files || files.length === 0)) return;

    store.setSendingMessage(true);

    const userMessage: Message = {
      id: uuidv4(),
      type: "message",
      text: messageText,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    // Add user message to the store FIRST
    store.addMessageToSession(activeSession.id, userMessage);

    // Create a placeholder bot message for streaming AFTER user message is in store
    const botMessageId = uuidv4();
    const initialBotMessage: Message = {
      id: botMessageId,
      type: "message",
      text: "",
      sender: "bot",
      timestamp: new Date().toISOString(),
      isStreaming: true,
    };
    store.addMessageToSession(activeSession.id, initialBotMessage);
    store.setBotThinking(true);

    if (files && files.length > 0) {
      console.log(
        "Files uploaded:",
        files.map((f) => f.name)
      );
      // TODO: Handle file uploads
    }

    // Get the most up-to-date session from the store AFTER adding messages
    const currentSessionState = useChatStore
      .getState()
      .chatSessions.find((s) => s.id === activeSession.id);
    if (!currentSessionState) {
      console.error(
        "Critical: Active session not found in store after adding messages."
      );
      store.setBotThinking(false);
      store.setSendingMessage(false);
      // Potentially update the bot message with an error
      store.updateMessageContent(
        activeSession.id,
        botMessageId,
        "Error: Could not find active session data."
      );
      store.setMessageStreamingState(activeSession.id, botMessageId, false);
      return;
    }

    const currentModel = store.availableModels.find(
      (m) => m.id === currentSessionState.modelId
    );
    if (!currentModel) {
      const errorText =
        "Error: Selected model configuration not found. Please try another model.";
      store.updateMessageContent(
        currentSessionState.id,
        botMessageId,
        errorText
      );
      store.setMessageStreamingState(
        currentSessionState.id,
        botMessageId,
        false
      );
      store.setBotThinking(false);
      store.setSendingMessage(false);
      return;
    }

    const apiKey = store.apiKeys[currentModel.provider];
    if (currentModel.apiKeyRequired && !apiKey) {
      const errorText = `Error: API key for ${currentModel.provider} is missing. Please set it in the settings.`;
      store.updateMessageContent(
        currentSessionState.id,
        botMessageId,
        errorText
      );
      store.setMessageStreamingState(
        currentSessionState.id,
        botMessageId,
        false
      );
      store.setBotThinking(false);
      store.setSendingMessage(false);
      return;
    }

    // Construct apiMessages from the latest session state, excluding the placeholder bot message
    const apiMessages = currentSessionState.messages
      .filter((item): item is Message => item.type === "message" && item.id !== botMessageId)
      .map((msg) => {
        return {
          role: msg.sender === "bot" ? "assistant" : "user",
          content: msg.text,
        };
      });

    // Safety check if apiMessages is somehow still empty (e.g. if user message wasn't properly added or filtered)
    if (apiMessages.length === 0) {
      console.error(
        "Critical: apiMessages array is empty before sending to API. This should not happen."
      );
      const errorText =
        "Error: Failed to prepare messages for the AI. Please try again.";
      store.updateMessageContent(
        currentSessionState.id,
        botMessageId,
        errorText
      );
      store.setMessageStreamingState(
        currentSessionState.id,
        botMessageId,
        false
      );
      store.setBotThinking(false);
      store.setSendingMessage(false);
      return;
    }

    const systemPromptToUse =
      currentSessionState.systemPrompt || store.globalSystemPrompt;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          modelId: currentSessionState.modelId,
          apiKey: apiKey,
          systemPrompt: systemPromptToUse,
        }),
      });

      if (!response.ok) {
        let errorData = {
          error: `API request failed with status ${response.status}`,
        };
        try {
          const responseText = await response.text(); // Read as text first
          try {
            errorData = JSON.parse(responseText); // Try to parse as JSON
          } catch {
            // Removed unused _parseError variable
            // If JSON parsing fails, use the text content directly or a part of it
            errorData.error =
              responseText.length > 150
                ? responseText.substring(0, 150) + "..."
                : responseText;
            if (!errorData.error)
              errorData.error = `API request failed with status ${response.status}. No error details provided.`;
          }
        } catch {
          // Removed unused _e variable
          errorData.error = response.statusText || errorData.error;
        }
        throw new Error(errorData.error);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // let accumulatedText = ""; // Not strictly needed if appending directly

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          store.setMessageStreamingState(
            currentSessionState.id,
            botMessageId,
            false
          );
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        // Check for special stream error signal
        if (chunk.includes("STREAM_ERROR:")) {
          const errorMessage =
            chunk.split("STREAM_ERROR:")[1]?.trim() ||
            "Unknown streaming error.";
          console.error("Streaming error from API route:", errorMessage);
          store.updateMessageContent(
            currentSessionState.id,
            botMessageId,
            `Error: ${errorMessage}`
          );
          store.setMessageStreamingState(
            currentSessionState.id,
            botMessageId,
            false
          );
          break;
        }
        // accumulatedText += chunk; // Not needed if appending directly
        store.appendMessageContent(currentSessionState.id, botMessageId, chunk);
      }
      const remaining = decoder.decode();
      if (remaining) {
        // accumulatedText += remaining; // Not needed
        store.appendMessageContent(
          currentSessionState.id,
          botMessageId,
          remaining
        );
      }

      const finalSessionCheck = useChatStore
        .getState()
        .chatSessions.find((s) => s.id === currentSessionState.id);
      const finalBotMsgCheck = finalSessionCheck?.messages.find(
        (m) => m.id === botMessageId
      ) as Message | undefined;

      if (finalBotMsgCheck?.isStreaming) {
        store.setMessageStreamingState(
          currentSessionState.id,
          botMessageId,
          false
        );
      }
    } catch (error: unknown) {
      // Changed 'any' to 'unknown'
      console.error("Failed to send message or process stream:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorText = errorMsg.startsWith("STREAM_ERROR:")
        ? errorMsg.replace("STREAM_ERROR:", "Streaming Error:")
        : errorMsg || "An unknown error occurred";
      store.updateMessageContent(
        currentSessionState.id,
        botMessageId,
        `Error: ${errorText}`
      );
      store.setMessageStreamingState(
        currentSessionState.id,
        botMessageId,
        false
      );
    } finally {
      store.setBotThinking(false);
      store.setSendingMessage(false);
    }
  };

  if (!activeSession) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-background text-foreground">
      <div className="flex-grow overflow-y-auto p-4 no-scrollbar">
        <MessageList messages={activeSession.messages} />
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} />{" "}
      {/* isSending prop removed as ChatInput gets it from store */}
    </div>
  );
}
