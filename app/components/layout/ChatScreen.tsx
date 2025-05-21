"use client"; // Required for useState and event handlers

import { useEffect, useRef } from "react";
import MessageList from "../chat/MessageList";
import ChatInput from "../chat/ChatInput";
import ThinkingIndicator from "../chat/ThinkingIndicator";
import {
  useChatStore,
  Message,
  useActiveChatSession,
  ChatSession,
  ApiKeys,
  Model as StoreModel, // Renamed to avoid conflict with Gemini's Message role 'model'
} from "@/app/store/chatStore";
import { WelcomeScreen } from "../chat/WelcomeScreen";

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
    } else if (store.chatSessions.length === 0 && useChatStore.persist.hasHydrated()) {
        // This case is handled by the store subscription now.
    }
  }, [store.activeChatSessionId, store.chatSessions, store.setActiveChatSession]);

  const handleSendMessage = async (messageText: string, files?: File[]) => {
    if (!activeSession) {
      console.error("No active chat session to send message.");
      return;
    }
    if (!messageText.trim() && (!files || files.length === 0)) return;

    store.setSendingMessage(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: messageText,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    store.addMessageToSession(activeSession.id, userMessage);

    if (files && files.length > 0) {
      console.log("Files uploaded:", files.map(f => f.name));
      // TODO: Handle file uploads: convert to base64 or upload to a service,
      // then include in payload for vision models.
      // For now, we just log them.
    }
    
    store.setBotThinking(true);

    const currentModel = store.availableModels.find(m => m.id === activeSession.modelId);
    if (!currentModel) {
      console.error("Selected model not found in available models.");
      store.setBotThinking(false);
      store.setSendingMessage(false);
      // Optionally add an error message to the chat
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        text: "Error: Selected model configuration not found. Please try another model.",
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      store.addMessageToSession(activeSession.id, errorMsg);
      return;
    }

    const apiKey = store.apiKeys[currentModel.provider];
    if (currentModel.apiKeyRequired && !apiKey) {
      console.error(`API key for ${currentModel.provider} is missing.`);
      store.setBotThinking(false);
      store.setSendingMessage(false);
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        text: `Error: API key for ${currentModel.provider} is missing. Please set it in the menu.`, 
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      store.addMessageToSession(activeSession.id, errorMsg);
      return;
    }

    // Prepare messages for API: use only role and content, map to provider requirements in API route
    const apiMessages = activeSession.messages.map(m => ({ 
        role: m.sender === 'bot' ? 'assistant' : 'user', // Generic roles for now, API route will adapt
        content: m.text 
    }));
    // Add the new user message to the list for the API call
    apiMessages.push({ role: 'user', content: userMessage.text });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages, // Send the current conversation history + new message
          modelId: activeSession.modelId,
          apiKey: apiKey, // Pass the API key for the selected model's provider
          systemPrompt: activeSession.systemPrompt, // Pass the system prompt for the current session
        }),
      });

      store.setBotThinking(false);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "An unknown API error occurred." }));
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const botResponse: Message = {
        id: crypto.randomUUID(),
        text: data.response || "No response text from API.",
        sender: "bot",
        timestamp: new Date().toISOString(),
        // thinkingSteps: data.thinkingSteps || [], // If API provided thinking steps
      };
      store.addMessageToSession(activeSession.id, botResponse);

    } catch (error: any) {
      console.error("Failed to send message:", error);
      store.setBotThinking(false); 
      const errorMsg: Message = {
        id: crypto.randomUUID(),
        text: `Error: ${error.message}`,
        sender: "bot",
        timestamp: new Date().toISOString(),
      };
      store.addMessageToSession(activeSession.id, errorMsg);
    }
    
    store.setSendingMessage(false);
  };

  if (!activeSession) {
    return <WelcomeScreen />;
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-grow overflow-y-auto p-4 no-scrollbar">
        <MessageList messages={activeSession.messages} />
        {store.isBotThinking && <ThinkingIndicator />} 
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSendMessage={handleSendMessage} /> {/* isSending prop removed as ChatInput gets it from store */}
    </div>
  );
} 