"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu as MenuIcon, X as XIcon, PlusCircle, Settings2, Trash2, Edit3 } from "lucide-react";
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
      className="bg-gray-800 text-white p-3 h-full relative flex flex-col shadow-lg print:hidden"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="flex items-center justify-between mb-1 absolute top-3 left-3 right-3 z-20">
          {!isMenuCollapsed && <h1 className="text-xl font-semibold pl-1">Omnichat</h1>}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMenu}
            className="hover:bg-gray-700 text-gray-300 hover:text-white ml-auto"
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
                <Button onClick={() => createNewChatSession()} className="w-full mb-3 bg-indigo-500 hover:bg-indigo-600">
                  <PlusCircle size={18} className="mr-2" /> New Chat
                </Button>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Chats</h2>
                <nav className="space-y-1 flex-grow overflow-y-auto max-h-[calc(100vh-450px)] no-scrollbar pr-1">
                  {chatSessions.length === 0 && (
                    <p className="text-sm text-gray-400 p-2">No chats yet.</p>
                  )}
                  {chatSessions.slice().reverse().map((session) => (
                    <div key={session.id} className="group flex items-center justify-between rounded-md hover:bg-gray-700">
                      <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault(); 
                            setActiveChatSession(session.id)
                        }}
                        className={`block p-2 text-sm truncate flex-grow
                          ${activeChatSessionId === session.id
                            ? "bg-gray-700 text-white font-medium"
                            : "text-gray-300 hover:text-white"}`}
                        title={session.name}
                      >
                        {session.name}
                      </a>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => { setEditingSessionId(session.id); setSessionNewName(session.name);}}>
                          <Edit3 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-400" onClick={() => setDeletingSessionId(session.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </nav>
              </div>

              <div className="mt-auto pt-3 border-t border-gray-700 flex-shrink-0">
                <div className="mb-3">
                  <label htmlFor="model-select" className="block text-xs font-medium text-gray-400 mb-1 px-1">
                    Select Model
                  </label>
                  <Select value={selectedModelId || ""} onValueChange={selectModel}>
                    <SelectTrigger id="model-select" className="w-full bg-gray-700 border-gray-600 text-white focus:ring-indigo-500">
                      <SelectValue placeholder="Choose a model" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 text-white border-gray-600">
                      {Object.entries(groupedModels).map(([providerName, modelsInGroup]) => (
                        <SelectGroup key={providerName}>
                          <SelectLabel className="text-gray-400">{providerName}</SelectLabel>
                          {modelsInGroup.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="hover:bg-gray-600 focus:bg-gray-600">
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
                    <label htmlFor="api-key-input" className="block text-xs font-medium text-gray-400 mb-1 px-1">
                      {selectedModel.provider} API Key
                    </label>
                    <div className="flex space-x-1.5">
                      <Input
                        id="api-key-input"
                        type="password"
                        placeholder={`Enter ${selectedModel.provider} API key`}
                        value={currentProviderApiKey}
                        onChange={handleApiKeyChange}
                        className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <Button onClick={handleApiKeySave} variant="secondary" size="sm" className="bg-indigo-500 hover:bg-indigo-600 text-white">
                        Save
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="system-prompt-input" className="block text-xs font-medium text-gray-400 mb-1 px-1">
                    Global System Prompt
                  </label>
                  <Textarea
                    id="system-prompt-input"
                    placeholder="Set a global system prompt..."
                    value={globalSystemPrompt}
                    onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                    className="w-full min-h-[60px] bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <Dialog open={!!editingSessionId} onOpenChange={(isOpen) => !isOpen && setEditingSessionId(null)}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Rename Chat Session</DialogTitle>
          </DialogHeader>
          <Input 
            value={sessionNewName} 
            onChange={(e) => setSessionNewName(e.target.value)} 
            placeholder="Enter new session name"
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 my-3"
          />
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="ghost" className="hover:bg-gray-700">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleRenameSession} className="bg-indigo-500 hover:bg-indigo-600">Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingSessionId} onOpenChange={(isOpen) => !isOpen && setDeletingSessionId(null)}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Chat Session</DialogTitle>
          </DialogHeader>
          <p className="py-3 text-gray-300">Are you sure you want to delete this chat session? This action cannot be undone.</p>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="ghost" className="hover:bg-gray-700">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleDeleteSession} variant="destructive">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
} 