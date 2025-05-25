"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Edit3,
  Menu as MenuIcon,
  Moon,
  PlusCircle,
  RotateCcw,
  Sun,
  Trash2,
  X as XIcon,
  Eraser,
} from "lucide-react";
import { Model, useChatStore } from "@/app/store/chatStore";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTheme } from "next-themes";
import SettingsDialog from "../settings/SettingsDialog";
import { toast } from "sonner";
import { FilePreview } from "../ui/file-preview";

export default function LeftSideMenu() {
  const {
    isMenuCollapsed,
    toggleMenu,
    availableModels,
    selectedModelId,
    selectModel,
    chatSessions,
    activeChatSessionId,
    createNewChatSession,
    setActiveChatSession,
    deleteChatSession,
    renameChatSession,
    globalSystemPrompt,
    setGlobalSystemPrompt,
    addSystemMessageToActiveChat,
    updateSessionSystemPrompt,
  } = useChatStore();

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionNewName, setSessionNewName] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  );
  const [clearingAllSessions, setClearingAllSessions] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [unsavedGlobalSystemPrompt, setUnsavedGlobalSystemPrompt] = useState(globalSystemPrompt);
  const [lastAppliedPromptForSession, setLastAppliedPromptForSession] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setUnsavedGlobalSystemPrompt(globalSystemPrompt);
  }, [globalSystemPrompt]);

  const activeSession = chatSessions.find((s) => s.id === activeChatSessionId);
  const displayModelId = activeSession
    ? activeSession.modelId
    : selectedModelId;

  useEffect(() => {
    if (activeSession) {
        setLastAppliedPromptForSession(activeSession.systemPrompt);
    } else {
        setLastAppliedPromptForSession(undefined);
    }
  }, [activeSession, activeChatSessionId]);

  const isPromptDirty = activeChatSessionId 
    ? unsavedGlobalSystemPrompt !== lastAppliedPromptForSession
    : unsavedGlobalSystemPrompt !== globalSystemPrompt;

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

  const handleClearAllSessions = () => {
    chatSessions.forEach((session) => deleteChatSession(session.id));
    setClearingAllSessions(false);
  };

  const handleApplyGlobalSystemPrompt = () => {
    if (!activeChatSessionId) {
      toast.error("No active chat session to apply the prompt to.");
      return;
    }

    setGlobalSystemPrompt(unsavedGlobalSystemPrompt);
    updateSessionSystemPrompt(activeChatSessionId, unsavedGlobalSystemPrompt);
    addSystemMessageToActiveChat(unsavedGlobalSystemPrompt);
    setLastAppliedPromptForSession(unsavedGlobalSystemPrompt);
    toast.success("Global system prompt applied to current chat!");
  };

  return (
    <motion.div
      initial={false}
      animate={isMenuCollapsed ? "collapsed" : "expanded"}
      variants={menuVariants}
      className="bg-sidebar text-sidebar-foreground p-3 h-full relative flex flex-col shadow-lg print:hidden"
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="flex items-center justify-between mb-1 absolute top-3 left-3 right-3 z-20">
        {!isMenuCollapsed && (
          <div className="flex items-center">
            <FilePreview src="/logo.svg" alt="Omnichat Logo" className="w-8 h-8 mr-2" />
            <h1 className="text-xl font-semibold pl-1 text-sidebar-foreground">
              Omnichat
            </h1>
          </div>
        )}
        <div className="flex items-center ml-auto">
          {!isMenuCollapsed && mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground mr-1 h-9 w-9"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMenu}
            className="hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground ml-auto"
            aria-label={isMenuCollapsed ? "Open menu" : "Close menu"}
          >
            {isMenuCollapsed ? <MenuIcon size={24} /> : <XIcon size={24} />}
          </Button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={isMenuCollapsed ? "collapsed" : "expanded"}
        variants={contentVariants}
        transition={{
          duration: 0.2,
          delay: isMenuCollapsed ? 0 : 0.05,
          ease: "easeInOut",
        }}
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
                <Button
                  onClick={() => createNewChatSession()}
                  className="w-full mb-3 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                >
                  <PlusCircle size={18} className="mr-2" /> New Chat
                </Button>
                <div className="group flex items-center justify-between mb-1.5 px-1">
                  <h2 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                    Chats
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClearingAllSessions(true)}
                    className="h-6 px-1.5 text-xs text-sidebar-foreground/50 opacity-80 group-hover:opacity-100 hover:text-destructive dark:hover:text-destructive/80 hover:bg-destructive/10"
                    aria-label="Clear all sessions"
                  >
                    <Eraser size={12} className="mr-1" />
                    Clear all
                  </Button>
                </div>
                <nav className="space-y-0.5 flex-grow overflow-y-auto max-h-[calc(100vh-450px)] no-scrollbar">
                  {chatSessions.length === 0 && (
                    <p className="text-sm text-sidebar-foreground/60 p-2">
                      No chats yet.
                    </p>
                  )}
                  {chatSessions
                    .slice()
                    .reverse()
                    .map((session) => (
                      <div
                        key={session.id}
                        className={`group flex items-center justify-between rounded-md transition-colors duration-150
                        ${
                          activeChatSessionId === session.id
                            ? "bg-sidebar-accent/60"
                            : "hover:bg-sidebar-accent/40"
                        }
                      `}
                      >
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setActiveChatSession(session.id);
                          }}
                          className={`block p-2 text-xs truncate flex-grow rounded-md
                          ${
                            activeChatSessionId === session.id
                              ? "text-sidebar-foreground font-medium"
                              : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground"
                          }`}
                          title={session.name}
                        >
                          {session.name}
                        </a>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white dark:hover:text-sidebar-foreground"
                            onClick={() => {
                              setEditingSessionId(session.id);
                              setSessionNewName(session.name);
                            }}
                          >
                            <Edit3 size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/20 hover:text-white dark:hover:text-destructive/80 dark:hover:bg-destructive/20"
                            onClick={() => setDeletingSessionId(session.id)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </div>
                    ))}
                </nav>
              </div>

              <div className="mt-auto pt-3 border-t border-sidebar-border/70 flex-shrink-0">
                <div>
                  <label
                    htmlFor="system-prompt-input"
                    className="block text-xs font-medium text-sidebar-foreground/70 mb-1 px-1"
                  >
                    Global System Prompt
                  </label>
                  <div className="relative w-full">
                    <Textarea
                      id="system-prompt-input"
                      placeholder="Set a global system prompt..."
                      value={unsavedGlobalSystemPrompt}
                      onChange={(e) => setUnsavedGlobalSystemPrompt(e.target.value)}
                      className="w-full min-h-[80px] bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder-sidebar-foreground/50 focus:ring-sidebar-ring focus:border-sidebar-ring no-scrollbar !text-xs pr-10 pb-2"
                      rows={5}
                    />
                    <div className="absolute bottom-1 right-1 flex items-center space-x-1">
                      {isPromptDirty ? (
                        <>
                          <Button
                            onClick={handleApplyGlobalSystemPrompt}
                            variant="ghost"
                            size="sm" 
                            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 h-auto px-1.5 py-0.5 text-xs flex items-center"
                            aria-label="Apply unsaved system prompt"
                          >
                            <Check size={14} className="mr-1" /> Apply
                          </Button>
                          <Button
                            onClick={() => setUnsavedGlobalSystemPrompt(lastAppliedPromptForSession || globalSystemPrompt)}
                            variant="ghost"
                            size="sm" 
                            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 h-auto px-1.5 py-0.5 text-xs flex items-center"
                            aria-label="Undo changes to system prompt"
                          >
                            <RotateCcw size={14} className="mr-1" /> Undo
                          </Button>
                        </>
                      ) : (
                        <div className="text-xs text-sidebar-foreground/60 flex items-center px-1.5 py-0.5">
                          <Check size={14} className="mr-1 text-green-500" /> Applied
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="my-3">
                  <label
                    htmlFor="model-select"
                    className="block text-xs font-medium text-sidebar-foreground/70 mb-1 px-1"
                  >
                    Select Model
                  </label>
                  <Select
                    value={displayModelId || ""}
                    onValueChange={selectModel}
                  >
                    <SelectTrigger
                      id="model-select"
                      className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground focus:ring-sidebar-ring focus:border-sidebar-ring text-xs"
                    >
                      <SelectValue placeholder="Choose a model" />
                    </SelectTrigger>
                    <SelectContent className="bg-sidebar text-sidebar-foreground border-sidebar-border max-h-60 overflow-y-auto">
                      {Object.entries(groupedModels).map(
                        ([providerName, modelsInGroup]) => (
                          <SelectGroup key={providerName}>
                            <SelectLabel className="text-sidebar-foreground/70 text-sm font-bold">
                              {providerName}
                            </SelectLabel>
                            {modelsInGroup.map((model) => (
                              <SelectItem
                                key={model.id}
                                value={model.id}
                                className="hover:bg-sidebar-accent focus:bg-sidebar-accent data-[highlighted]:bg-sidebar-accent data-[state=checked]:bg-sidebar-accent/80 text-xs"
                              >
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mb-3">
                  <SettingsDialog isMenuCollapsed={isMenuCollapsed} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <Dialog
        open={!!editingSessionId}
        onOpenChange={(isOpen) => !isOpen && setEditingSessionId(null)}
      >
        <DialogContent className="sm:max-w-[425px] bg-sidebar border-sidebar-border text-sidebar-foreground">
          <DialogHeader>
            <DialogTitle className="text-sidebar-foreground">
              Rename Chat Session
            </DialogTitle>
          </DialogHeader>
          <Input
            value={sessionNewName}
            onChange={(e) => setSessionNewName(e.target.value)}
            placeholder="Enter new session name"
            className="bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder-sidebar-foreground/50 focus:ring-sidebar-ring focus:border-sidebar-ring my-3"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleRenameSession}
              className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingSessionId}
        onOpenChange={(isOpen) => !isOpen && setDeletingSessionId(null)}
      >
        <DialogContent className="sm:max-w-[425px] bg-sidebar border-sidebar-border text-sidebar-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Chat Session
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-sidebar-foreground/80 py-3">
            Are you sure you want to delete &quot;
            {chatSessions.find((s) => s.id === deletingSessionId)?.name ||
              "this chat"}
            &quot;?
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleDeleteSession}
              className="bg-destructive hover:bg-destructive/90 text-white dark:text-black"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={clearingAllSessions}
        onOpenChange={(isOpen) => !isOpen && setClearingAllSessions(false)}
      >
        <DialogContent className="sm:max-w-[425px] bg-sidebar border-sidebar-border text-sidebar-foreground">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Clear All Chat Sessions
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-sidebar-foreground/80 py-3">
            Are you sure you want to delete all chat sessions? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleClearAllSessions}
              className="bg-destructive hover:bg-destructive/90 text-white dark:text-black"
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
