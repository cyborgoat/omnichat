"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Check,
    Edit3,
    PlusCircle,
    RotateCcw,
    Trash2,
    Eraser,
    Moon,
    Sun,
    Menu as MenuIcon,
    X as XIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Model, useChatStore, useEnabledModels } from "@/app/store/chatStore";
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
import SettingsDialog from "../settings/SettingsDialog";
import { toast } from "sonner";
import { FilePreview } from "../ui/file-preview";

const sidebarVariants = {
    expanded: { width: "16rem", opacity: 1 },
    collapsed: { width: "4rem", opacity: 1 },
};



const itemFadeSlideVariants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeInOut" } },
  exit: { opacity: 0, x: -10, transition: { duration: 0.15, ease: "easeInOut" } },
};


export function AppSidebar() {
    const {
        isMenuCollapsed,
        toggleMenu,
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

    const enabledModels = useEnabledModels();
    const { theme, setTheme } = useTheme();

    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [sessionNewName, setSessionNewName] = useState("");
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
    const [clearingAllSessions, setClearingAllSessions] = useState(false);
    const [unsavedGlobalSystemPrompt, setUnsavedGlobalSystemPrompt] = useState(globalSystemPrompt);
    const [lastAppliedPromptForSession, setLastAppliedPromptForSession] = useState<string | undefined>(undefined);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setUnsavedGlobalSystemPrompt(globalSystemPrompt);
    }, [globalSystemPrompt]);

    const activeSession = chatSessions.find((s) => s.id === activeChatSessionId);
    const displayModelId = activeSession ? activeSession.modelId : selectedModelId;

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

    const groupedModels = useMemo(() => {
        return enabledModels.reduce((acc, model) => {
            (acc[model.provider] = acc[model.provider] || []).push(model);
            return acc;
        }, {} as Record<string, Model[]>);
    }, [enabledModels]);

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

    const handleToggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <>
            <motion.div
                initial={false}
                animate={isMenuCollapsed ? "collapsed" : "expanded"}
                variants={sidebarVariants}
                className="bg-sidebar text-sidebar-foreground p-3 h-screen relative flex flex-col shadow-lg print:hidden border-r border-sidebar-border"
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-2 flex-shrink-0 h-10 relative"> {/* Added relative positioning */}
                    {/* Expanded: Logo + Title on left */}
                    <AnimatePresence initial={false} mode="sync">
                        {!isMenuCollapsed && (
                            <motion.div
                                key="logo-title-expanded-header" // Unique key
                                variants={itemFadeSlideVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="flex items-center flex-shrink-0" // Added flex-shrink-0
                            >
                                <FilePreview src="/omnichat.svg" alt="Omnichat Logo" className="w-8 h-8 mr-2 flex-shrink-0 rounded-full" />
                                <h1 className="text-xl font-semibold text-sidebar-foreground whitespace-nowrap">
                                    Omnichat
                                </h1>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Collapsed: No Logo (hidden) */}

                    {/* Theme Toggle (Expanded Only) & Menu Toggle (Always Right Aligned) */}
                    {/* This div is always on the right. When collapsed, menu toggle is pushed by invisible theme toggle space or centered by itself. */}
                    <div className={`flex items-center ml-auto}`}>
                        <AnimatePresence>
                            {!isMenuCollapsed && mounted && (
                                <motion.div
                                    key="theme-toggle-expanded-header" // Unique key
                                    variants={itemFadeSlideVariants}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={handleToggleTheme}
                                        className="hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground mr-1 h-9 w-9"
                                        aria-label="Toggle theme"
                                    >
                                        {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMenu}
                            className="hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground h-9 w-9" // Simplified classes
                            aria-label={isMenuCollapsed ? "Open menu" : "Close menu"}
                        >
                            {isMenuCollapsed ? <MenuIcon size={24} /> : <XIcon size={24} />}
                        </Button>
                    </div>
                </div>
                {/* Main Scrollable Content Area */}
                <div className="flex-grow overflow-y-auto overflow-x-hidden no-scrollbar relative">
                    <AnimatePresence mode="wait">
                        {!isMenuCollapsed && (
                            <motion.div
                                key="expanded-content"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10, transition: { duration:0.15 } }}
                                transition={{ duration: 0.25, ease: "easeInOut", delay: 0.1 }}
                                className="flex flex-col h-full justify-between"
                            >
                                {/* Top Section: New Chat, Chat List */}
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
                                            variant="ghost" size="sm" onClick={() => setClearingAllSessions(true)}
                                            className="h-6 px-1.5 text-xs text-sidebar-foreground/50 opacity-80 group-hover:opacity-100 hover:text-destructive dark:hover:text-destructive/80 hover:bg-destructive/10"
                                            aria-label="Clear all sessions"
                                        >
                                            <Eraser size={12} className="mr-1" /> Clear all
                                        </Button>
                                    </div>
                                    <nav className="space-y-0.5 flex-grow overflow-y-auto max-h-[calc(100vh-520px)] sm:max-h-[calc(100vh-480px)] no-scrollbar pr-1">
                                        {chatSessions.length === 0 && (
                                            <p className="text-sm text-sidebar-foreground/60 p-2">No chats yet.</p>
                                        )}
                                        {chatSessions.slice().reverse().map((session) => (
                                            <div key={session.id} className={`group flex items-center justify-between rounded-md transition-colors duration-150 ${activeChatSessionId === session.id ? "bg-sidebar-accent/60" : "hover:bg-sidebar-accent/40"}`}>
                                                <a href="#" onClick={(e) => { e.preventDefault(); setActiveChatSession(session.id); }} className={`block p-2 text-xs truncate flex-grow rounded-md ${activeChatSessionId === session.id ? "text-sidebar-foreground font-medium" : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground"}`} title={session.name}>
                                                    {session.name}
                                                </a>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center pr-1.5">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={() => { setEditingSessionId(session.id); setSessionNewName(session.name); }}><Edit3 size={15} /></Button>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20 hover:text-destructive-foreground" onClick={() => setDeletingSessionId(session.id)}><Trash2 size={15} /></Button>
                                                </div>
                                            </div>
                                        ))}
                                    </nav>
                                </div>

                                {/* Bottom Section: System Prompt, Model Select, Settings */}
                                <div className="mt-auto pt-3 border-t border-sidebar-border/70 flex-shrink-0">
                                    <div>
                                        <label htmlFor="system-prompt-input" className="block text-xs font-medium text-sidebar-foreground/70 mb-1 px-1">Global System Prompt</label>
                                        <div className="flex flex-col relative w-full p-1">
                                            <Textarea id="system-prompt-input" placeholder="Set a global system prompt..." value={unsavedGlobalSystemPrompt} onChange={(e) => setUnsavedGlobalSystemPrompt(e.target.value)} className="w-full min-h-[70px] max-h-[110px] bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground placeholder-sidebar-foreground/50 focus-visible:ring-sidebar-ring/50 focus-visible:border-sidebar-ring focus-visible:ring-[2px] no-scrollbar !text-xs resize-none" rows={3}/>
                                            <div className="flex justify-end items-center space-x-1 mt-2">
                                                {isPromptDirty ? (
                                                    <>
                                                        <Button onClick={handleApplyGlobalSystemPrompt} variant="ghost" size="sm" className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 h-auto px-1.5 py-0.5 text-xs flex items-center" aria-label="Apply unsaved system prompt"><Check size={14} className="mr-1" /> Apply</Button>
                                                        <Button onClick={() => setUnsavedGlobalSystemPrompt(lastAppliedPromptForSession || globalSystemPrompt)} variant="ghost" size="sm" className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/70 h-auto px-1.5 py-0.5 text-xs flex items-center" aria-label="Undo changes to system prompt"><RotateCcw size={14} className="mr-1" /> Undo</Button>
                                                    </>
                                                ) : (<div className="text-xs text-sidebar-foreground/60 flex items-center px-1.5 py-0.5 h-[26px]"><Check size={14} className="mr-1 text-green-500" /> Applied</div>)
                                                }
                                            </div>
                                            <div className={`text-xs text-orange-600 dark:text-orange-400 flex items-center px-1 py-0.5 mt-1 self-start rounded-md ${isPromptDirty ? 'visible' : 'invisible'} h-5`}>⚠️ Changes not applied</div>
                                        </div>
                                    </div>
                                    <div className="my-2 px-1">
                                        <label htmlFor="model-select" className="block text-xs font-medium text-sidebar-foreground/70 mb-1">Select Model</label>
                                        <Select value={displayModelId || ""} onValueChange={selectModel}>
                                            <SelectTrigger id="model-select" className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground focus:ring-sidebar-ring focus:border-sidebar-ring text-xs h-9"><SelectValue placeholder="Choose a model" /></SelectTrigger>
                                            <SelectContent className="bg-sidebar text-sidebar-foreground border-sidebar-border max-h-60 overflow-y-auto">
                                                {enabledModels.length === 0 ? (<div className="p-2 text-xs text-sidebar-foreground/60">No models enabled.</div>)
                                                    : (Object.entries(groupedModels).map(([providerName, modelsInGroup]) => (
                                                        <SelectGroup key={providerName}>
                                                            <SelectLabel className="text-sidebar-foreground/70 text-xs font-semibold">{providerName}</SelectLabel>
                                                            {modelsInGroup.map((model) => (<SelectItem key={model.id} value={model.id} className="hover:bg-sidebar-accent focus:bg-sidebar-accent data-[highlighted]:bg-sidebar-accent data-[state=checked]:bg-sidebar-accent/80 text-xs">{model.name}</SelectItem>))}
                                                        </SelectGroup>
                                                    )))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="px-1 mt-2 mb-1">
                                        <SettingsDialog isMenuCollapsed={isMenuCollapsed} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                {/* Collapsed State Action Icons - Positioned at the bottom */}
                <AnimatePresence>
                    {isMenuCollapsed && mounted && (
                        <motion.div
                            key="collapsed-actions"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, transition: {delay: 0.1} }}
                            exit={{ opacity: 0 }}
                            className="mt-auto flex flex-col items-center space-y-2 py-3 border-t border-sidebar-border/70 flex-shrink-0"
                        >
                            <Button variant="ghost" size="icon" onClick={() => createNewChatSession()} className="hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground h-9 w-9" aria-label="New Chat">
                                <PlusCircle size={20} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleToggleTheme} className="hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground h-9 w-9" aria-label="Toggle theme">
                                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                            </Button>
                            <SettingsDialog isMenuCollapsed={isMenuCollapsed} />
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>

            {/* Dialogs */}
            <Dialog open={!!editingSessionId} onOpenChange={(isOpen) => !isOpen && setEditingSessionId(null)}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground"> {/* Updated to use card styles */}
                    <DialogHeader><DialogTitle>Rename Chat Session</DialogTitle></DialogHeader>
                    <Input value={sessionNewName} onChange={(e) => setSessionNewName(e.target.value)} placeholder="Enter new session name" className="my-3"/>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleRenameSession}>Rename</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!deletingSessionId} onOpenChange={(isOpen) => !isOpen && setDeletingSessionId(null)}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground"> {/* Updated to use card styles */}
                    <DialogHeader><DialogTitle className="text-destructive">Delete Chat Session</DialogTitle></DialogHeader>
                    <p className="text-sm py-3">Are you sure you want to delete &quot;{chatSessions.find((s) => s.id === deletingSessionId)?.name || "this chat"}&quot;?</p>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleDeleteSession} variant="destructive">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={clearingAllSessions} onOpenChange={(isOpen) => !isOpen && setClearingAllSessions(false)}>
                <DialogContent className="sm:max-w-[425px] bg-card border-border text-card-foreground"> {/* Updated to use card styles */}
                    <DialogHeader><DialogTitle className="text-destructive">Clear All Chat Sessions</DialogTitle></DialogHeader>
                    <p className="text-sm py-3">Are you sure you want to delete all chat sessions? This action cannot be undone.</p>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleClearAllSessions} variant="destructive">Clear All</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}