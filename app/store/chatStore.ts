import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import { toast } from "sonner";

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

export type ProxySettings = {
  enabled: boolean;
  http?: string;
  https?: string;
  socks5?: string;
};

export type ModelSettings = {
  streamEnabled: boolean;
  temperature: number;
  maxTokens: number;
};

// Default model settings, used for initialization and hydration normalization
const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  streamEnabled: true,
  temperature: 0.7,
  maxTokens: 4096,
};

// Define which parts of the state should be persisted
interface PersistedChatState {
  isMenuCollapsed: boolean;
  availableModels: Model[];
  enabledModelIds: string[];
  selectedModelId: string | null;
  apiKeys: ApiKeys;
  globalSystemPrompt: string;
  chatSessions: ChatSession[];
  activeChatSessionId: string | null;
  proxySettings: ProxySettings;
  modelSettings: ModelSettings;
}

export interface ChatState extends PersistedChatState {
  // UI State (transient, not persisted)
  isBotThinking: boolean;
  isSendingMessage: boolean;
  currentAbortController: AbortController | null;

  // Actions (defined in the store creator)
  toggleMenu: () => void;
  selectModel: (modelId: string) => void;
  setApiKey: (provider: string, key: string) => void;
  setGlobalSystemPrompt: (prompt: string) => void;
  setEnabledModels: (modelIds: string[]) => void;
  setProxySettings: (settings: ProxySettings) => void;
  setModelSettings: (settings: Partial<ModelSettings>) => void;
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
  setCurrentAbortController: (controller: AbortController | null) => void;
  stopCurrentGeneration: () => void;
  syncAvailableModels: () => void;
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
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-sonnet-4-20250514", 
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-7-sonnet-20250219",
    name: "Claude Sonnet 3.7",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude Sonnet 3.5 v2",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-5-sonnet-20240620",
    name: "Claude Sonnet 3.5",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude Haiku 3.5",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude Opus 3",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude Sonnet 3",
    provider: "Anthropic",
    apiKeyRequired: true,
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude Haiku 3",
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
  {
    id: "deepseek-reasoner",
    name: "DeepSeek reasoner",
    provider: "Deepseek",
    apiKeyRequired: true,
  },
  // Qwen (Alibaba DashScope)
  {
    id: "qwen-turbo",
    name: "Qwen Turbo",
    provider: "Qwen",
    apiKeyRequired: true,
  }, // Tongyi Qwen Turbo
  {
    id: "qwen-plus",
    name: "Qwen Plus",
    provider: "Qwen",
    apiKeyRequired: true,
  }, // Tongyi Qwen Plus
  {
    id: "qwen-max",
    name: "Qwen Max",
    provider: "Qwen",
    apiKeyRequired: true,
  }, // Tongyi Qwen Max
  // Qwen3 Deep Thinking Models
  {
    id: "qwen-plus-latest",
    name: "Qwen3 Plus (Latest)",
    provider: "Qwen",
    apiKeyRequired: true,
  }, // Qwen3 with thinking
  {
    id: "qwen-plus-2025-04-28",
    name: "Qwen3 Plus (0428)",
    provider: "Qwen",
    apiKeyRequired: true,
  }, // Qwen3 snapshot
  {
    id: "qwen-turbo-latest",
    name: "Qwen3 Turbo (Latest)",
    provider: "Qwen",
    apiKeyRequired: true,
  }, // Qwen3 Turbo with thinking
  // QwQ Deep Thinking Models
  {
    id: "qwq-plus",
    name: "QwQ Plus (Deep Thinking)",
    provider: "Qwen",
    apiKeyRequired: true,
  }, // QwQ reasoning model
  {
    id: "qwq-32b-preview",
    name: "QwQ 32B Preview",
    provider: "Qwen",
    apiKeyRequired: true,
  }, // QwQ 32B model
  // Volces (Volcengine)
  {
    id: "deepseek-r1-250120",
    name: "DeepSeek-R1",
    provider: "Volces",
    apiKeyRequired: true,
  },
  {
    id: "deepseek-v3-250324", // Commented out until correct ID is known
    name: "DeepSeek-V3",
    provider: "Volces",
    apiKeyRequired: true,
  },
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
      globalSystemPrompt:
        "You are a helpful AI assistant. Respond in Markdown format.",
      chatSessions: [],
      activeChatSessionId: null,
      proxySettings: { enabled: false },
      modelSettings: DEFAULT_MODEL_SETTINGS, // Use the constant for initial state
      // Initial Transient UI State
      isBotThinking: false,
      isSendingMessage: false,
      currentAbortController: null,

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
      setGlobalSystemPrompt: (prompt) => set({ globalSystemPrompt: prompt }),
      setEnabledModels: (modelIds) => set({ enabledModelIds: modelIds }),
      setProxySettings: (settings) => set({ proxySettings: settings }),
      setModelSettings: (settings) => 
        set((state) => ({ 
          modelSettings: { ...state.modelSettings, ...settings } 
        })),

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
      setCurrentAbortController: (controller) => set({ currentAbortController: controller }),
      stopCurrentGeneration: () => {
        const controller = get().currentAbortController;
        if (controller) {
          controller.abort();
          toast.info("Chat generation stopped by user.");
        }
        set({
          isBotThinking: false,
          isSendingMessage: false,
          currentAbortController: null,
        });
      },
      
      // Sync available models with the latest initialModels (useful when new models are added)
      syncAvailableModels: () => {
        const updatedEnabledModels = initialModels.map(m => m.id);
        
        set({
          availableModels: initialModels,
          enabledModelIds: updatedEnabledModels,
        });
        
        console.log("Available models synced with latest model definitions");
        toast.success("Model list updated with latest available models");
      },
    }),
    {
      name: "omnichat-storage",
      storage: createJSONStorage(() => localStorage as StateStorage),
      partialize: (state: ChatState): PersistedChatState => {
        // Correctly destructure to exclude only transient fields
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isBotThinking, isSendingMessage, currentAbortController, ...rest } = state; // Added currentAbortController
        return rest; // rest now correctly matches PersistedChatState
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
  useChatStore.persist.onFinishHydration(() => {
    // Get the current state from the store after hydration and merging
    const currentState = useChatStore.getState();

    // 1. Handle initial chat session creation if none exist
    if (currentState.chatSessions.length === 0) {
      console.log(
        "No chat sessions found after hydration, creating initial session."
      );
      currentState.createNewChatSession(); // This action calls set internally
    }

    // 2. Normalize modelSettings to ensure all fields are present and valid
    const currentModelSettings = currentState.modelSettings;
    
    const normalizedModelSettings: ModelSettings = {
      streamEnabled: (typeof currentModelSettings?.streamEnabled === 'boolean')
        ? currentModelSettings.streamEnabled
        : DEFAULT_MODEL_SETTINGS.streamEnabled,
      temperature: (typeof currentModelSettings?.temperature === 'number' && !isNaN(currentModelSettings.temperature))
        ? currentModelSettings.temperature
        : DEFAULT_MODEL_SETTINGS.temperature,
      maxTokens: (typeof currentModelSettings?.maxTokens === 'number' && !isNaN(currentModelSettings.maxTokens) && currentModelSettings.maxTokens > 0)
        ? currentModelSettings.maxTokens
        : DEFAULT_MODEL_SETTINGS.maxTokens,
    };

    // Only update the store if the normalized settings are different from the current ones
    // or if currentModelSettings was initially missing/invalid.
    if (
      !currentModelSettings || // If currentModelSettings was undefined, null, etc.
      currentModelSettings.streamEnabled !== normalizedModelSettings.streamEnabled ||
      currentModelSettings.temperature !== normalizedModelSettings.temperature ||
      currentModelSettings.maxTokens !== normalizedModelSettings.maxTokens
    ) {
      // Directly set the entire modelSettings object to its normalized version.
      // This ensures that modelSettings is always a complete object with valid properties.
      useChatStore.setState({ modelSettings: normalizedModelSettings });
      console.log("ModelSettings normalized after hydration:", normalizedModelSettings);
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
