"use client";

import { useChatStore } from "@/app/store/chatStore";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

export function WelcomeScreen() {
  const createNewChatSession = useChatStore((state) => state.createNewChatSession);
  const availableModels = useChatStore((state) => state.availableModels);
  const selectedModelId = useChatStore((state) => state.selectedModelId);

  const handleStartChat = () => {
    // Create a new chat, optionally with the currently globally selected model
    createNewChatSession(selectedModelId || availableModels[0]?.id);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-8 text-center">
      <MessageSquarePlus size={64} className="text-indigo-500 mb-6" />
      <h1 className="text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
        Welcome to Omnichat
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        Select a model and start a new conversation from the left panel, or simply click below to begin.
      </p>
      <Button onClick={handleStartChat} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
        Start New Chat
      </Button>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-12">
        Tip: You can manage your API keys and select different AI models from the menu.
      </p>
    </div>
  );
} 