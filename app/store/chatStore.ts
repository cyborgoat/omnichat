import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

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
  text: string;
  sender: "user" | "bot";
  timestamp: string;
  thinkingSteps?: string[];
  // We can add more fields like 'metadata' for images or files, or error states
}

export interface ChatSession {
  id: string;
  name: string; 
  messages: Message[];
  modelId: string; 
  systemPrompt: string;
  createdAt: string;
}

export type ApiKeys = {
  [provider: string]: string | undefined;
};

// Define which parts of the state should be persisted
interface PersistedChatState {
  isMenuCollapsed: boolean;
  availableModels: Model[]; // Assuming models list can change or be configured by user later
  selectedModelId: string | null;
  apiKeys: ApiKeys;
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
  setGlobalSystemPrompt: (prompt: string) => void;
  createNewChatSession: (modelId?: string, name?: string) => string; 
  setActiveChatSession: (sessionId: string) => void;
  deleteChatSession: (sessionId: string) => void;
  renameChatSession: (sessionId: string, newName: string) => void;
  updateSessionSystemPrompt: (sessionId: string, prompt: string) => void;
  addMessageToSession: (sessionId: string, message: Message) => void;
  setBotThinking: (isThinking: boolean) => void;
  setSendingMessage: (isSending: boolean) => void;
}

const initialModels: Model[] = [
  // OpenAI
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', apiKeyRequired: true },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', apiKeyRequired: true },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', apiKeyRequired: true },
  // Google Gemini
  { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro', provider: 'Google', apiKeyRequired: true },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'Google', apiKeyRequired: true }, // Example, older version
  // Anthropic Claude
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic', apiKeyRequired: true },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'Anthropic', apiKeyRequired: true },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic', apiKeyRequired: true },
  // Deepseek
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'Deepseek', apiKeyRequired: true },
  { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'Deepseek', apiKeyRequired: true },
  // Qwen (Alibaba Cloud)
  { id: 'qwen-turbo', name: 'Qwen Turbo', provider: 'Qwen', apiKeyRequired: true }, // Tongyi Qwen Turbo
  { id: 'qwen-plus', name: 'Qwen Plus', provider: 'Qwen', apiKeyRequired: true },  // Tongyi Qwen Plus
  { id: 'qwen-max', name: 'Qwen Max', provider: 'Qwen', apiKeyRequired: true },    // Tongyi Qwen Max
];

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial Persisted State
      isMenuCollapsed: false,
      availableModels: initialModels,
      selectedModelId: initialModels[0]?.id || null,
      apiKeys: {},
      globalSystemPrompt: "You are a helpful AI assistant. Respond in Markdown format.", // Updated prompt
      chatSessions: [],
      activeChatSessionId: null,
      // Initial Transient UI State
      isBotThinking: false,
      isSendingMessage: false,

      // Implementations
      toggleMenu: () => set((state) => ({ isMenuCollapsed: !state.isMenuCollapsed })),
      selectModel: (modelId) => set({ selectedModelId: modelId }),
      setApiKey: (provider, key) => set((state) => ({ apiKeys: { ...state.apiKeys, [provider]: key } })),
      setGlobalSystemPrompt: (prompt) => set({ globalSystemPrompt: prompt }),

      createNewChatSession: (modelIdToUse, name) => {
        const newSessionId = crypto.randomUUID();
        const currentSelectedModelId = get().selectedModelId;
        const modelToUse = modelIdToUse || currentSelectedModelId || initialModels[0]?.id;
        
        if (!modelToUse) {
            console.error("No model available to create a new chat session.");
            return "error-no-model-selected"; 
        }
        const modelDetails = get().availableModels.find(m => m.id === modelToUse);
        const sessionName = name || `Chat with ${modelDetails?.name || 'AI'} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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

      setActiveChatSession: (sessionId) => set({ activeChatSessionId: sessionId }),

      deleteChatSession: (sessionId) => {
        set((state) => {
          const newSessions = state.chatSessions.filter(s => s.id !== sessionId);
          let newActiveId = state.activeChatSessionId;
          if (state.activeChatSessionId === sessionId) {
            newActiveId = newSessions.length > 0 ? newSessions[0].id : null;
          }
          return {
            chatSessions: newSessions,
            activeChatSessionId: newActiveId,
          };
        });
        // If no chats left after deletion, create a new one
        if (get().chatSessions.length === 0) {
            get().createNewChatSession();
        }
      },

      renameChatSession: (sessionId, newName) => {
        set((state) => ({
          chatSessions: state.chatSessions.map(s => s.id === sessionId ? { ...s, name: newName } : s),
        }));
      },

      updateSessionSystemPrompt: (sessionId, prompt) => {
        set((state) => ({
          chatSessions: state.chatSessions.map(s => s.id === sessionId ? { ...s, systemPrompt: prompt } : s),
        }));
      },

      addMessageToSession: (sessionId, message) => {
        set((state) => ({
          chatSessions: state.chatSessions.map(s =>
            s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
          ),
        }));
      },
      
      setBotThinking: (isThinking) => set({ isBotThinking: isThinking }),
      setSendingMessage: (isSending) => set({ isSendingMessage: isSending }),
    }),
    {
      name: 'omnichat-storage', 
      storage: createJSONStorage(() => localStorage as StateStorage), 
      partialize: (state: ChatState): PersistedChatState => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isBotThinking, isSendingMessage, ...rest } = state; // Destructure to exclude transient state
        return rest; // Persist only the defined PersistedChatState parts
      },
    }
  )
);

export const useActiveChatSession = () => {
  const activeId = useChatStore(state => state.activeChatSessionId);
  const sessions = useChatStore(state => state.chatSessions);
  return sessions.find(s => s.id === activeId);
};

export const useModelsByProvider = (provider: string) => {
  const models = useChatStore(state => state.availableModels);
  return models.filter(m => m.provider === provider);
};

// Simplified subscription to run once after hydration
if (typeof window !== 'undefined') { // Ensure this only runs on the client
    useChatStore.persist.onFinishHydration((state: ChatState) => {
        if (state.chatSessions.length === 0) {
            console.log("No chat sessions found after hydration, creating initial session.");
            useChatStore.getState().createNewChatSession();
        }
    });
}

export const useCurrentModelApiKey = () => {
    const selectedModelId = useChatStore(state => state.selectedModelId);
    const availableModels = useChatStore(state => state.availableModels);
    const apiKeys = useChatStore(state => state.apiKeys);

    const model = availableModels.find(m => m.id === selectedModelId);
    if (model && model.apiKeyRequired) {
        return apiKeys[model.provider];
    }
    return undefined;
}; 