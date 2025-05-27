"use client";

import {useChatStore} from "@/app/store/chatStore";
import {Button} from "@/components/ui/button";
import {FilePreview} from "../ui/file-preview";

export function WelcomeScreen() {
  const createNewChatSession = useChatStore((state) => state.createNewChatSession);
  const availableModels = useChatStore((state) => state.availableModels);
  const selectedModelId = useChatStore((state) => state.selectedModelId);

  const handleStartChat = () => {
    // Create a new chat, optionally with the currently globally selected model
    createNewChatSession(selectedModelId || availableModels[0]?.id);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-background p-8 text-center">
      <FilePreview src="/omnichat.svg" alt="Omnichat Logo" className="w-16 h-16 mb-6 flex-shrink-0 rounded-full" />
      <h1 className="text-3xl font-semibold text-foreground mb-3">
        Welcome to Omnichat
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Select a model and start a new conversation from the left panel, or simply click below to begin.
      </p>
      <Button onClick={handleStartChat} size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
        Start New Chat
      </Button>
      <p className="text-xs text-muted-foreground/70 mt-12">
        Tip: You can manage your API keys and select different AI models from the menu.
      </p>
    </div>
  );
} 