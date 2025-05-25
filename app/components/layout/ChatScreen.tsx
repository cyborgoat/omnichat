"use client"; // Required for useState and event handlers

import {v4 as uuidv4} from "uuid";
import {useEffect, useRef, useCallback, useState} from "react";
import MessageList from "../chat/MessageList";
import ChatInput from "../chat/ChatInput";
import {Message, useActiveChatSession, useChatStore,} from "@/app/store/chatStore";
import {WelcomeScreen} from "../chat/WelcomeScreen";
import { API_ENDPOINTS } from "@/app/constants";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export default function ChatScreen() {
  const store = useChatStore(); // Get the whole store for easier access to multiple states/actions
  const activeSession = useActiveChatSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isUserActivelyScrolling, setIsUserActivelyScrolling] = useState(false);
  
  const scrollToBottom = useCallback((force = false) => {
    if (!messagesEndRef.current || (!force && (isUserScrolling || isUserActivelyScrolling))) return;
    
    const container = scrollContainerRef.current;
    if (!container) return;
    
    // Check if user is near the bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    if (force || isNearBottom) {
      // Simple smooth scroll to bottom
      messagesEndRef.current.scrollIntoView({ 
        behavior: "smooth", 
        block: "nearest"
      });
    }
  }, [isUserScrolling, isUserActivelyScrolling]);

  // Debounced scroll function for streaming content
  const debouncedScrollToBottom = useCallback(() => {
    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // If it's been more than 1 second since last scroll, scroll immediately
    if (timeSinceLastScroll > 1000) {
      scrollToBottom();
      lastScrollTimeRef.current = now;
    } else {
      // Otherwise, debounce the scroll
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom();
        lastScrollTimeRef.current = Date.now();
      }, 500); // Wait 500ms before scrolling
    }
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
    }, 150); // User stops being "actively scrolling" after 150ms of no scroll events
    
    // Check if user is at the bottom (within 100px threshold for more tolerance)
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setIsUserScrolling(!isAtBottom);
    
    // Clear any pending auto-scroll if user is actively scrolling away from bottom
    if (!isAtBottom && scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  // Effect for handling message changes during streaming
  useEffect(() => {
    if (store.isBotThinking || (activeSession?.messages.some(msg => msg.type === "message" && msg.isStreaming))) {
      // During streaming, use debounced scroll (only if user is near bottom)
      debouncedScrollToBottom();
    } else {
      // For new messages or when streaming ends, scroll only if user is near bottom
      scrollToBottom(false); // Don't force scroll
    }
  }, [activeSession?.messages, store.isBotThinking, debouncedScrollToBottom, scrollToBottom]);

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
      const response = await fetch(API_ENDPOINTS.CHAT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          modelId: currentSessionState.modelId,
          apiKey: apiKey,
          systemPrompt: systemPromptToUse,
          proxySettings: store.proxySettings,
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
      let buffer = ""; // Buffer to handle partial thinking markers

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining content in buffer
          if (buffer) {
            store.appendMessageContent(currentSessionState.id, botMessageId, buffer);
          }
          store.setMessageStreamingState(
            currentSessionState.id,
            botMessageId,
            false
          );
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Check for special stream error signal
        if (buffer.includes("STREAM_ERROR:")) {
          const errorMessage =
            buffer.split("STREAM_ERROR:")[1]?.trim() ||
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
        
        // Process thinking content markers
        while (buffer.includes("__THINKING_START__") && buffer.includes("__THINKING_END__")) {
          const startIndex = buffer.indexOf("__THINKING_START__");
          const endIndex = buffer.indexOf("__THINKING_END__") + "__THINKING_END__".length;
          
          // Add content before thinking marker to message
          if (startIndex > 0) {
            const beforeThinking = buffer.substring(0, startIndex);
            store.appendMessageContent(currentSessionState.id, botMessageId, beforeThinking);
          }
          
          // Extract thinking content
          const thinkingContent = buffer.substring(
            startIndex + "__THINKING_START__".length,
            endIndex - "__THINKING_END__".length
          );
          
          if (thinkingContent.trim()) {
            store.addThinkingStep(currentSessionState.id, botMessageId, thinkingContent.trim());
          }
          
          // Remove processed content from buffer
          buffer = buffer.substring(endIndex);
        }
        
        // If no more thinking markers, add remaining content to message
        if (!buffer.includes("__THINKING_START__")) {
          if (buffer) {
            store.appendMessageContent(currentSessionState.id, botMessageId, buffer);
            buffer = "";
          }
        }
      }
      const remaining = decoder.decode();
      if (remaining) {
        buffer += remaining;
        // Process any final thinking content
        while (buffer.includes("__THINKING_START__") && buffer.includes("__THINKING_END__")) {
          const startIndex = buffer.indexOf("__THINKING_START__");
          const endIndex = buffer.indexOf("__THINKING_END__") + "__THINKING_END__".length;
          
          if (startIndex > 0) {
            const beforeThinking = buffer.substring(0, startIndex);
            store.appendMessageContent(currentSessionState.id, botMessageId, beforeThinking);
          }
          
          const thinkingContent = buffer.substring(
            startIndex + "__THINKING_START__".length,
            endIndex - "__THINKING_END__".length
          );
          
          if (thinkingContent.trim()) {
            store.addThinkingStep(currentSessionState.id, botMessageId, thinkingContent.trim());
          }
          
          buffer = buffer.substring(endIndex);
        }
        
        // Add any remaining content
        if (buffer) {
          store.appendMessageContent(currentSessionState.id, botMessageId, buffer);
        }
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
    <div className="flex-1 flex flex-col h-screen bg-background text-foreground relative">
      <div 
        ref={scrollContainerRef}
        className="flex-grow overflow-y-auto p-4 no-scrollbar"
        onScroll={handleScroll}
      >
        <MessageList messages={activeSession.messages} />
        {/* Scroll anchor for smooth bottom positioning */}
        <div 
          ref={messagesEndRef} 
          className="h-4" 
          aria-hidden="true"
        />
      </div>
      
      {/* Scroll to bottom button */}
      {isUserScrolling && (store.isBotThinking || activeSession?.messages.some(msg => msg.type === "message" && msg.isStreaming)) && (
        <Button
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-6 rounded-full w-12 h-12 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground z-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
          size="icon"
          aria-label="Scroll to bottom"
        >
          <ChevronDown size={20} />
        </Button>
      )}
      
      <ChatInput onSendMessage={handleSendMessage} />{" "}
      {/* isSending prop removed as ChatInput gets it from store */}
    </div>
  );
}
