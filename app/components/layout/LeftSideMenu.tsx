"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu as MenuIcon, X as XIcon, PlusCircle, Settings2, Trash2, Edit3, Eye, EyeOff } from "lucide-react";
import { useChatStore, Model } from "@/app/store/chatStore";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

export default function LeftSideMenu() {
  const {
    isMenuCollapsed,
    toggleMenu,
    availableModels,
    selectedModelId,
    selectModel,
    apiKeys,
    setApiKey,
    chatSessions,
    activeChatSessionId,
    createNewChatSession,
    setActiveChatSession,
    deleteChatSession,
    renameChatSession,
    globalSystemPrompt,
    setGlobalSystemPrompt,
  } = useChatStore();

  const [currentProviderApiKey, setCurrentProviderApiKey] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionNewName, setSessionNewName] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);

  const selectedModel = availableModels.find(m => m.id === selectedModelId);
  const currentProvider = selectedModel?.provider;

  useMemo(() => {
    if (currentProvider) {
      setCurrentProviderApiKey(apiKeys[currentProvider] || "");
    }
  }, [currentProvider, apiKeys]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentProviderApiKey(e.target.value);
  };

  const handleApiKeySave = () => {
    if (currentProvider) {
      setApiKey(currentProvider, currentProviderApiKey);
      console.log(`API Key for ${currentProvider} saved.`);
    }
  };

  const menuVariants = {
    expanded: { width: "16rem", opacity: 1 },
    collapsed: { width: "4rem", opacity: 1 },
  };

  const contentVariants = {
    expanded: { opacity: 1, x: 0, display: "block" },
    collapsed: { opacity: 0, x: -20, transitionEnd: { display: "none" } },
  };

  const groupedModels = useMemo(() => {
    return availableModels.reduce((acc, model) => {
      (acc[model.provider] = acc[model.provider] || []).push(model);
      return acc;
    }, {} as Record<string, Model[]>);
  }, [availableModels]);

  const handleRenameSession = () => {
    if (editingSessionId && sessionNewName.trim()) {
      renameChatSession(editingSessionId, sessionNewName.trim());
      setEditingSessionId(null);
    }
  };

  const handleDeleteSession = () => {
    if (deletingSessionId) {
      deleteChatSession(deletingSessionId);
      setDeletingSessionId(null);
    }
  };

  return (
    <motion.div
      initial={false}
      animate={isMenuCollapsed ? "collapsed" : "expanded"}
      variants={menuVariants}
      className="bg-gray-900 text-gray-200 p-3 h-full relative flex flex-col shadow-lg print:hidden"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="flex items-center justify-between mb-1 absolute top-3 left-3 right-3 z-20">
          {!isMenuCollapsed && <h1 className="text-xl font-semibold pl-1 text-white">Omnichat</h1>}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMenu}
            className="hover:bg-gray-700/50 text-gray-400 hover:text-white ml-auto"
            aria-label={isMenuCollapsed ? "Open menu" : "Close menu"}
          >
            {isMenuCollapsed ? <MenuIcon size={24} /> : <XIcon size={24} />}
          </Button>
      </div>

      <motion.div
        initial={false}
        animate={isMenuCollapsed ? "collapsed" : "expanded"}
        variants={contentVariants}
        transition={{ duration: 0.2, delay: isMenuCollapsed ? 0 : 0.05, ease: "easeInOut" }}
        className="mt-12 flex flex-col flex-grow overflow-hidden"
      >
        <AnimatePresence>
          {!isMenuCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col flex-grow justify-between h-full overflow-y-auto no-scrollbar pr-1"
            >
              <div className="flex-shrink-0">
                <Button onClick={() => createNewChatSession()} className="w-full mb-3 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <PlusCircle size={18} className="mr-2" /> New Chat
                </Button>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-1">Chats</h2>
                <nav className="space-y-0.5 flex-grow overflow-y-auto max-h-[calc(100vh-450px)] no-scrollbar">
                  {chatSessions.length === 0 && (
                    <p className="text-sm text-gray-500 p-2">No chats yet.</p>
                  )}
                  {chatSessions.slice().reverse().map((session) => (
                    <div 
                      key={session.id} 
                      className={`group flex items-center justify-between rounded-md transition-colors duration-150
                        ${activeChatSessionId === session.id
                          ? "bg-gray-700/60"
                          : "hover:bg-gray-700/50"
                        }
                      `}
                    >
                      <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault(); 
                            setActiveChatSession(session.id)
                        }}
                        className={`block p-2 text-sm truncate flex-grow rounded-md
                          ${activeChatSessionId === session.id
                            ? "text-white font-medium"
                            : "text-gray-300 group-hover:text-white"
                          }`}
                        title={session.name}
                      >
                        {session.name}
                      </a>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-white" onClick={() => { setEditingSessionId(session.id); setSessionNewName(session.name);}}>
                          <Edit3 size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400" onClick={() => setDeletingSessionId(session.id)}>
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </nav>
              </div>

              <div className="mt-auto pt-3 border-t border-gray-700/70 flex-shrink-0">
                <div className="mb-3">
                  <label htmlFor="model-select" className="block text-xs font-medium text-gray-500 mb-1 px-1">
                    Select Model
                  </label>
                  <Select value={selectedModelId || ""} onValueChange={selectModel}>
                    <SelectTrigger id="model-select" className="w-full bg-gray-800 border-gray-700 text-gray-200 focus:ring-indigo-500 focus:border-indigo-500">
                      <SelectValue placeholder="Choose a model" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 text-gray-200 border-gray-700 max-h-60 overflow-y-auto">
                      {Object.entries(groupedModels).map(([providerName, modelsInGroup]) => (
                        <SelectGroup key={providerName}>
                          <SelectLabel className="text-gray-500">{providerName}</SelectLabel>
                          {modelsInGroup.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="hover:bg-gray-700 focus:bg-gray-700 data-[highlighted]:bg-gray-700 data-[state=checked]:bg-gray-700/80">
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedModel?.apiKeyRequired && (
                  <div className="mb-3">
                    <label htmlFor="api-key-input" className="block text-xs font-medium text-gray-500 mb-1 px-1">
                      {selectedModel.provider} API Key
                    </label>
                    <div className="flex space-x-1.5 items-center">
                      <Input
                        id="api-key-input"
                        type={isApiKeyVisible ? "text" : "password"}
                        placeholder={`Enter ${selectedModel.provider} API key`}
                        value={currentProviderApiKey}
                        onChange={handleApiKeyChange}
                        className="w-full bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setIsApiKeyVisible(!isApiKeyVisible)} 
                        className="text-gray-400 hover:text-white h-9 w-9 flex-shrink-0"
                        aria-label={isApiKeyVisible ? "Hide API key" : "Show API key"}
                      >
                        {isApiKeyVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                      <Button onClick={handleApiKeySave} variant="secondary" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white h-9">
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="system-prompt-input" className="block text-xs font-medium text-gray-500 mb-1 px-1">
                    Global System Prompt
                  </label>
                  <Textarea
                    id="system-prompt-input"
                    placeholder="Set a global system prompt..."
                    value={globalSystemPrompt}
                    onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                    className="w-full min-h-[60px] bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 no-scrollbar"
                    rows={3}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <Dialog open={!!editingSessionId} onOpenChange={(isOpen) => !isOpen && setEditingSessionId(null)}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700/80 text-gray-200">
          <DialogHeader>
            <DialogTitle className="text-white">Rename Chat Session</DialogTitle>
          </DialogHeader>
          <Input 
            value={sessionNewName} 
            onChange={(e) => setSessionNewName(e.target.value)} 
            placeholder="Enter new session name"
            className="bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 my-3"
          />
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="ghost" className="hover:bg-gray-700/50 text-gray-300 hover:text-white">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleRenameSession} className="bg-indigo-600 hover:bg-indigo-700 text-white">Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSessionId} onOpenChange={(isOpen) => !isOpen && setDeletingSessionId(null)}>
        <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-700/80 text-gray-200">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Chat Session</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-300 py-3">Are you sure you want to delete &quot;{chatSessions.find(s => s.id === deletingSessionId)?.name || 'this chat'}&quot;?</p>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="ghost" className="hover:bg-gray-700/50 text-gray-300 hover:text-white">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleDeleteSession} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
} 