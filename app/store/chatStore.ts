import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";

// Types
export interface Model {
  id: string;
  name: string;
  provider: string; // e.g., "OpenAI", "Google", "Anthropic", "Deepseek", "Qwen"
  apiKeyRequired: boolean;
  // Potentially add model-specific params like context window size, vision support, etc.
}

export interface Message {
  id: string;
  type: "message";
  text: string;
  sender: "user" | "bot";
  timestamp: string;
  thinkingSteps?: string[]; // Contains reasoning content chunks
  isStreaming?: boolean; // Added for stream handling
  // We can add more fields like 'metadata' for images or files, or error states
}

export interface SystemPromptUpdateEvent {
  id: string;
  type: "system_prompt_update";
  promptContent: string; // The actual system prompt text that was applied
  timestamp: string;
}

export type ChatItem = Message | SystemPromptUpdateEvent;

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatItem[]; // Changed from Message[]
  modelId: string;
  systemPrompt: string; // This is the actual system prompt used for LLM requests for this session
  createdAt: string;
}

export type ApiKeys = {
  [provider: string]: string | undefined;
};

export interface ProxySettings {
  enabled?: boolean;
  http?: string;
  https?: string;
  socks?: string;
}

// Define which parts of the state should be persisted
interface PersistedChatState {
  isMenuCollapsed: boolean;
  availableModels: Model[]; // Assuming models list can change or be configured by user later
  enabledModelIds: string[]; // Track which models are enabled for display
  selectedModelId: string | null;
  apiKeys: ApiKeys;
  proxySettings: ProxySettings;
  globalSystemPrompt: string;
  chatSessions: ChatSession[];
  activeChatSessionId: string | null;
}

export interface ChatState extends PersistedChatState {
  // UI State (transient, not persisted)
  isBotThinking: boolean;
  isSendingMessage: boolean;

  // Actions (defined in the store creator)
  toggleMenu: () => void;
  selectModel: (modelId: string) => void;
  setApiKey: (provider: string, key: string) => void;
  setProxySettings: (settings: ProxySettings) => void;
  setGlobalSystemPrompt: (prompt: string) => void;
  setEnabledModels: (modelIds: string[]) => void;
  createNewChatSession: (modelId?: string, name?: string) => string;
  setActiveChatSession: (sessionId: string) => void;
  deleteChatSession: (sessionId: string) => void;
  renameChatSession: (sessionId: string, newName: string) => void;
  updateSessionSystemPrompt: (sessionId: string, prompt: string) => void;
  addMessageToSession: (sessionId: string, message: Message) => void;
  updateMessageContent: (
    sessionId: string,
    messageId: string,
    newContent: string
  ) => void;
  appendMessageContent: (
    sessionId: string,
    messageId: string,
    contentChunk: string
  ) => void;
  addThinkingStep: (
    sessionId: string,
    messageId: string,
    thinkingContent: string
  ) => void;
  setMessageStreamingState: (
    sessionId: string,
    messageId: string,
    isStreaming: boolean
  ) => void;
  setBotThinking: (isThinking: boolean) => void;
  setSendingMessage: (isSending: boolean) => void;
  addSystemMessageToActiveChat: (systemPrompt: string) => void;
}

const initialModels: Model[] = [
  // OpenAI
  { id: "o3", name: "o3", provider: "OpenAI", apiKeyRequired: true },
  {
    id: "gpt-4.1-preview",
    name: "GPT-4.1 Preview",
    provider: "OpenAI",
    apiKeyRequired: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    apiKeyRequired: true,
  },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", apiKeyRequired: true },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    apiKeyRequired: true,
  },
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI", apiKeyRequired: true },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    apiKeyRequired: true,
  },
  // Google Gemini
  {
    id: "gemini-2.5-pro-preview-05-06",
    name: "Gemini 2.5 Pro Preview",
    provider: "Google",
    apiKeyRequired: true,
  },
  {
    id: "gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash Preview",
    provider: "Google",
    apiKeyRequired: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    apiKeyRequired: true,
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    apiKeyRequired: true,
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "Google",
    apiKeyRequired: true,
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash-8B",
    provider: "Google",
    apiKeyRequired: true,
  },
  // Anthropic Claude
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  // Deepseek
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "Deepseek",
    apiKeyRequired: true,
  },
  {
    id: "deepseek-coder",
    name: "DeepSeek Coder",
    provider: "Deepseek",
    apiKeyRequired: true,
  },
  // Qwen (Alibaba DashScope)
  {
    id: "qwen-turbo",
    name: "Qwen Turbo",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // Tongyi Qwen Turbo
  {
    id: "qwen-plus",
    name: "Qwen Plus",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // Tongyi Qwen Plus
  {
    id: "qwen-max",
    name: "Qwen Max",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // Tongyi Qwen Max
  // Qwen3 Deep Thinking Models
  {
    id: "qwen-plus-latest",
    name: "Qwen3 Plus (Latest)",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // Qwen3 with thinking
  {
    id: "qwen-plus-2025-04-28",
    name: "Qwen3 Plus (0428)",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // Qwen3 snapshot
  {
    id: "qwen-turbo-latest",
    name: "Qwen3 Turbo (Latest)",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // Qwen3 Turbo with thinking
  // QwQ Deep Thinking Models
  {
    id: "qwq-plus",
    name: "QwQ Plus (Deep Thinking)",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // QwQ reasoning model
  {
    id: "qwq-32b-preview",
    name: "QwQ 32B Preview",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // QwQ 32B model
  // DeepSeek-R1 Deep Thinking
  {
    id: "deepseek-r1",
    name: "DeepSeek-R1 (Deep Thinking)",
    provider: "Qwen(DashScope)",
    apiKeyRequired: true,
  }, // DeepSeek-R1 via Dashscope
];

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial Persisted State
      isMenuCollapsed: false,
      availableModels: initialModels,
      enabledModelIds: initialModels.map((m) => m.id), // Initially all models are enabled
      selectedModelId: initialModels[0]?.id || null,
      apiKeys: {},
      proxySettings: {},
      globalSystemPrompt:
        "You are a helpful AI assistant. Respond in Markdown format.",
      chatSessions: [],
      activeChatSessionId: null,
      // Initial Transient UI State
      isBotThinking: false,
      isSendingMessage: false,

      // Implementations
      toggleMenu: () =>
        set((state) => ({ isMenuCollapsed: !state.isMenuCollapsed })),
      selectModel: (modelId) => {
        set((state) => {
          const newSelectedModelId = modelId;
          if (state.activeChatSessionId) {
            return {
              selectedModelId: newSelectedModelId,
              chatSessions: state.chatSessions.map((session) =>
                session.id === state.activeChatSessionId
                  ? { ...session, modelId: newSelectedModelId }
                  : session
              ),
            };
          }
          return { selectedModelId: newSelectedModelId };
        });
      },
      setApiKey: (provider, key) =>
        set((state) => ({ apiKeys: { ...state.apiKeys, [provider]: key } })),
      setProxySettings: (settings) => set({ proxySettings: settings }),
      setGlobalSystemPrompt: (prompt) => set({ globalSystemPrompt: prompt }),
      setEnabledModels: (modelIds) => set({ enabledModelIds: modelIds }),

      createNewChatSession: (modelIdToUse, name) => {
        const newSessionId = uuidv4(); // Use uuidv4 to generate a unique ID
        const currentSelectedModelId = get().selectedModelId;
        const modelToUse =
          modelIdToUse || currentSelectedModelId || initialModels[0]?.id;

        if (!modelToUse) {
          console.error("No model available to create a new chat session.");
          return "error-no-model-selected";
        }
        const modelDetails = get().availableModels.find(
          (m) => m.id === modelToUse
        );
        const sessionName =
          name ||
          `Chat with ${
            modelDetails?.name || "AI"
          } - ${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}`;

        const newSession: ChatSession = {
          id: newSessionId,
          name: sessionName,
          messages: [],
          modelId: modelToUse,
          systemPrompt: get().globalSystemPrompt,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          chatSessions: [...state.chatSessions, newSession],
          activeChatSessionId: newSessionId,
        }));
        return newSessionId;
      },

      setActiveChatSession: (sessionId) => {
        set((state) => {
          const sessionToActivate = state.chatSessions.find(
            (s) => s.id === sessionId
          );
          if (sessionToActivate) {
            return {
              activeChatSessionId: sessionId,
              selectedModelId: sessionToActivate.modelId, // Sync global select with active session's model
            };
          }
          return { activeChatSessionId: sessionId }; // Fallback, though session should always be found
        });
      },

      deleteChatSession: (sessionId) => {
        set((state) => {
          const newSessions = state.chatSessions.filter(
            (s) => s.id !== sessionId
          );
          let newActiveId = state.activeChatSessionId;
          if (state.activeChatSessionId === sessionId) {
            newActiveId =
              newSessions.length > 0
                ? newSessions
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.createdAt).getTime() -
                        new Date(a.createdAt).getTime()
                    )[0].id
                : null;
          }
          return {
            chatSessions: newSessions,
            activeChatSessionId: newActiveId,
          };
        });
      },

      renameChatSession: (sessionId, newName) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId ? { ...s, name: newName } : s
          ),
        }));
      },

      updateSessionSystemPrompt: (sessionId, prompt) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId ? { ...s, systemPrompt: prompt } : s
          ),
        }));
      },

      addMessageToSession: (sessionId, message) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? { ...s, messages: [...s.messages, message] }
              : s
          ),
        }));
      },

      updateMessageContent: (sessionId, messageId, newContent) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((item) =>
                    item.id === messageId && item.type === "message"
                      ? { ...item, text: newContent, isStreaming: false }
                      : item
                  ),
                }
              : s
          ),
        }));
      },

      appendMessageContent: (sessionId, messageId, contentChunk) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((item) =>
                    item.id === messageId && item.type === "message"
                      ? {
                          ...item,
                          text: item.text + contentChunk,
                          isStreaming: true,
                        }
                      : item
                  ),
                }
              : s
          ),
        }));
      },

      addThinkingStep: (sessionId, messageId, thinkingContent) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((item) =>
                    item.id === messageId && item.type === "message"
                      ? {
                          ...item,
                          thinkingSteps: [
                            ...(item.thinkingSteps || []),
                            thinkingContent,
                          ],
                        }
                      : item
                  ),
                }
              : s
          ),
        }));
      },

      setMessageStreamingState: (sessionId, messageId, isStreaming) => {
        set((state) => ({
          chatSessions: state.chatSessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((item) =>
                    item.id === messageId && item.type === "message"
                      ? { ...item, isStreaming }
                      : item
                  ),
                }
              : s
          ),
        }));
      },

      setBotThinking: (isThinking) => set({ isBotThinking: isThinking }),
      setSendingMessage: (isSending) => set({ isSendingMessage: isSending }),

      addSystemMessageToActiveChat: (promptContent) => {
        set((state) => {
          const activeSessionId = state.activeChatSessionId;
          if (activeSessionId && promptContent && promptContent.trim() !== "") {
            const newEvent: SystemPromptUpdateEvent = {
              id: uuidv4(),
              type: "system_prompt_update",
              promptContent: promptContent,
              timestamp: new Date().toISOString(),
            };
            return {
              chatSessions: state.chatSessions.map((session) =>
                session.id === activeSessionId
                  ? { ...session, messages: [...session.messages, newEvent] }
                  : session
              ),
            };
          }
          return {}; // No change if no active session or empty/whitespace prompt
        });
      },
    }),
    {
      name: "omnichat-storage",
      storage: createJSONStorage(() => localStorage as StateStorage),
      partialize: (state: ChatState): PersistedChatState => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isBotThinking, isSendingMessage, ...rest } = state;
        return rest;
      },
    }
  )
);

// Hook to get the full active chat session object
export const useActiveChatSession = () => {
  const activeId = useChatStore((state) => state.activeChatSessionId);
  const sessions = useChatStore((state) => state.chatSessions);
  return sessions.find((s) => s.id === activeId);
};

// Hook to get models filtered by a specific provider
export const useModelsByProvider = (provider: string) => {
  const models = useChatStore((state) => state.availableModels);
  return models.filter((m) => m.provider === provider);
};

// Creates an initial session if none exist after hydration.
if (typeof window !== "undefined") {
  useChatStore.persist.onFinishHydration((state: ChatState) => {
    if (state.chatSessions.length === 0) {
      console.log(
        "No chat sessions found after hydration, creating initial session."
      );
      useChatStore.getState().createNewChatSession();
    }
  });
}

// Hook to get the API key for the currently selected model
export const useCurrentModelApiKey = () => {
  const selectedModelId = useChatStore((state) => state.selectedModelId);
  const availableModels = useChatStore((state) => state.availableModels);
  const apiKeys = useChatStore((state) => state.apiKeys);

  const model = availableModels.find((m) => m.id === selectedModelId);
  if (model && model.apiKeyRequired) {
    return apiKeys[model.provider];
  }
  return undefined;
};

// Hook to get enabled models only
export const useEnabledModels = () => {
  const availableModels = useChatStore((state) => state.availableModels);
  const enabledModelIds = useChatStore((state) => state.enabledModelIds);
  return availableModels.filter((model) => enabledModelIds.includes(model.id));
};
