"use client"; // Required for useState and event handlers

import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useCallback, useState } from "react";
import MessageList from "../chat/MessageList";
import ChatInput from "../chat/ChatInput";
import {
  Message,
  useActiveChatSession,
  useChatStore,
} from "@/app/store/chatStore";
import { WelcomeScreen } from "../chat/WelcomeScreen";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { handleChat } from "@/app/lib/chat-client";

export default function ChatScreen() {
  const store = useChatStore(); // Get the whole store for easier access to multiple states/actions
  const activeSession = useActiveChatSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isUserActivelyScrolling, setIsUserActivelyScrolling] = useState(false);
  const prevMessageCountRef = useRef<number | undefined>(
    activeSession?.messages.length
  );

  const scrollToBottom = useCallback(
    (force = false) => {
      if (!messagesEndRef.current) return;
      const container = scrollContainerRef.current;
      if (!container) return;

      if (force) {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      } else {
        const isNearBottom =
          container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
          150;
        if (isNearBottom && !isUserActivelyScrolling) {
          messagesEndRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        }
      }
    },
    [isUserActivelyScrolling]
  );

  // Simplified scroll function for streaming content
  const scrollToBottomIfNeeded = useCallback(() => {
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Use a shorter delay for more responsive scrolling during streaming
    scrollTimeoutRef.current = setTimeout(() => {
      scrollToBottom();
    }, 100); // Much shorter delay for better responsiveness
  }, [scrollToBottom]);

  // Handle user scroll detection
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Set user as actively scrolling
    setIsUserActivelyScrolling(true);

    // Clear the active scrolling timeout and set a new one
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserActivelyScrolling(false);
    }, 200); // User stops being "actively scrolling" after 200ms of no scroll events

    // Check if user is at the bottom (within 150px threshold for more tolerance)
    const isAtBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;
    setIsUserScrolling(!isAtBottom);

    // Clear any pending auto-scroll if user is actively scrolling away from bottom
    if (!isAtBottom && scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  // Consolidated useEffect for auto-scrolling
  useEffect(() => {
    const lastMessage =
      activeSession?.messages[activeSession.messages.length - 1];
    const isStreaming =
      lastMessage?.type === "message" && lastMessage.isStreaming;

    let isNewMessageAdded = false;
    if (
      activeSession &&
      prevMessageCountRef.current !== activeSession.messages.length
    ) {
      isNewMessageAdded = true;
    }

    if (isNewMessageAdded) {
      // New message added (user sent or bot placeholder created), force scroll after a tiny delay for DOM
      setTimeout(() => scrollToBottom(true), 0);
    } else if (isStreaming && store.isBotThinking) {
      // Content is actively streaming into an existing message bubble
      scrollToBottomIfNeeded();
    } else if (!isStreaming && !store.isBotThinking) {
      // Streaming just ended or a message was fully received without streaming initially
      // Ensure it scrolls if near bottom, but don't force if user scrolled up.
      setTimeout(() => scrollToBottom(false), 50);
    }

    // Update the ref *after* comparison for the next render
    if (activeSession) {
      prevMessageCountRef.current = activeSession.messages.length;
    }
  }, [
    activeSession,
    activeSession?.messages,
    store.isBotThinking,
    scrollToBottom,
    scrollToBottomIfNeeded,
  ]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!store.activeChatSessionId && store.chatSessions.length > 0) {
      store.setActiveChatSession(store.chatSessions[0].id);
    } else if (
      store.chatSessions.length === 0 &&
      useChatStore.persist.hasHydrated()
    ) {
      // This case is handled by the store subscription now.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    
    // Check for empty message and provide user feedback
    if (!messageText.trim() && (!files || files.length === 0)) {
      // Add a helpful bot message to guide the user
      const helpMessageId = uuidv4();
      const helpMessage: Message = {
        id: helpMessageId,
        type: "message",
        text: "Please enter a message to get started! I'm here to help you with any questions or tasks you have.",
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      store.addMessageToSession(activeSession.id, helpMessage);
      return;
    }

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

    // Look for model in both available models and custom models
    const allModels = [...store.availableModels, ...store.customModels];
    
    console.log("DEBUG: Model lookup details:", {
      searchingForModelId: currentSessionState.modelId,
      availableModels: store.availableModels.length,
      customModels: store.customModels.length,
      allModelsCount: allModels.length,
      allModelIds: allModels.map(m => m.id),
      customModelDetails: store.customModels.map(m => ({ id: m.id, name: m.name, provider: m.provider }))
    });
    
    let currentModel = allModels.find(
      (m) => m.id === currentSessionState.modelId
    );
    
    // Fallback: if not found by ID, try to find by name for custom models
    if (!currentModel && currentSessionState.modelId.startsWith('custom-')) {
      console.log("Model not found by ID, trying to match by name...");
      currentModel = store.customModels.find(m => 
        m.id.includes(currentSessionState.modelId.replace('custom-', '')) ||
        m.name.toLowerCase().includes(currentSessionState.modelId.replace('custom-', '').replace(/-/g, ' '))
      );
      if (currentModel) {
        console.log("Found model by name fallback:", currentModel);
      }
    }

    if (!currentModel || !currentModel.provider) {
      const errorText =
        `Error: Model "${currentSessionState.modelId}" not found. Available models: ${allModels.map(m => `${m.name} (${m.id})`).join(', ')}`;
      console.error("Model lookup failed:", {
        searchingForModelId: currentSessionState.modelId,
        availableModelIds: allModels.map(m => m.id),
        availableModels: allModels.map(m => ({ id: m.id, name: m.name, provider: m.provider }))
      });
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
      .filter(
        (item): item is Message =>
          item.type === "message" && item.id !== botMessageId
      )
      .map((msg) => {
        return {
          role:
            msg.sender === "bot" ? ("assistant" as const) : ("user" as const),
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

    try {
      // Prepare the request for handleChat
      const chatStream = handleChat({
        messages: currentSessionState.messages
          .filter((m) => m.type === "message")
          .map((m) => ({
            role: (m as Message).sender === "bot" ? "assistant" : "user",
            content: (m as Message).text,
          })),
        modelId: currentSessionState.modelId,
        provider: currentModel.provider,
        apiKey: apiKey || "",
        systemPrompt: currentSessionState.systemPrompt,
        streamEnabled: store.modelSettings.streamEnabled,
        temperature: store.modelSettings.temperature,
        maxTokens: store.modelSettings.maxTokens,
      });

      let accumulatedResponse = "";

      for await (const chunk of chatStream) {
        accumulatedResponse += chunk;

        // Process thinking content markers
        while (
          accumulatedResponse.includes("__THINKING_START__") &&
          accumulatedResponse.includes("__THINKING_END__")
        ) {
          const startIndex = accumulatedResponse.indexOf("__THINKING_START__");
          const endIndex =
            accumulatedResponse.indexOf("__THINKING_END__") +
            "__THINKING_END__".length;

          // Add content before thinking marker to message
          if (startIndex > 0) {
            const beforeThinking = accumulatedResponse.substring(0, startIndex);
            store.appendMessageContent(
              currentSessionState.id,
              botMessageId,
              beforeThinking
            );
          }

          // Extract thinking content
          const thinkingContent = accumulatedResponse.substring(
            startIndex + "__THINKING_START__".length,
            endIndex - "__THINKING_END__".length
          );

          if (thinkingContent.trim()) {
            store.addThinkingStep(
              currentSessionState.id,
              botMessageId,
              thinkingContent.trim()
            );
          }

          // Remove processed content from buffer
          accumulatedResponse = accumulatedResponse.substring(endIndex);
        }

        // If no more thinking markers, add remaining content to message
        if (!accumulatedResponse.includes("__THINKING_START__")) {
          if (accumulatedResponse) {
            store.appendMessageContent(
              currentSessionState.id,
              botMessageId,
              accumulatedResponse
            );
            accumulatedResponse = "";
          }
        }
      }

      // Process any remaining content in buffer
      if (accumulatedResponse) {
        // Handle any final thinking content
        while (
          accumulatedResponse.includes("__THINKING_START__") &&
          accumulatedResponse.includes("__THINKING_END__")
        ) {
          const startIndex = accumulatedResponse.indexOf("__THINKING_START__");
          const endIndex =
            accumulatedResponse.indexOf("__THINKING_END__") +
            "__THINKING_END__".length;

          if (startIndex > 0) {
            const beforeThinking = accumulatedResponse.substring(0, startIndex);
            store.appendMessageContent(
              currentSessionState.id,
              botMessageId,
              beforeThinking
            );
          }

          const thinkingContent = accumulatedResponse.substring(
            startIndex + "__THINKING_START__".length,
            endIndex - "__THINKING_END__".length
          );

          if (thinkingContent.trim()) {
            store.addThinkingStep(
              currentSessionState.id,
              botMessageId,
              thinkingContent.trim()
            );
          }

          accumulatedResponse = accumulatedResponse.substring(endIndex);
        }

        // Add any remaining content
        if (accumulatedResponse) {
          store.appendMessageContent(
            currentSessionState.id,
            botMessageId,
            accumulatedResponse
          );
        }
      }

      // Mark streaming as complete
      store.setMessageStreamingState(
        currentSessionState.id,
        botMessageId,
        false
      );

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
    <div className="flex-1 flex flex-col bg-background text-foreground overflow-hidden pt-12">
      <div
        ref={scrollContainerRef}
        className="flex-grow overflow-y-auto no-scrollbar p-4 pb-6"
        onScroll={handleScroll}
      >
        <MessageList messages={activeSession.messages} />
        
        {/* Scroll anchor for smooth bottom positioning */}
        <div ref={messagesEndRef} className="h-4" aria-hidden="true" />
      </div>
      {/* Scroll to bottom button */}
      {isUserScrolling &&
        (store.isBotThinking ||
          activeSession?.messages.some(
            (msg) => msg.type === "message" && msg.isStreaming
          )) && (
          <Button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-20 right-6 rounded-full w-12 h-12 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground z-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
            size="icon"
            aria-label="Scroll to bottom"
          >
            <ChevronDown size={20} />
          </Button>
        )}
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
}
