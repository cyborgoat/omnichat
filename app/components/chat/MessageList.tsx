import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BotMessageSquare, Check, Copy, User } from "lucide-react";
import {
  ChatItem,
  Message,
  SystemPromptUpdateEvent,
} from "@/app/store/chatStore";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  prism as lightTheme,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import React, { useEffect, useState } from "react";
import { FilePreview } from "../ui/file-preview";

interface MessageListProps {
  messages: ChatItem[];
}

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const CodeBlock = ({ inline, className, children }: CodeBlockProps) => {
  const { theme } = useTheme();
  const [isCopied, setIsCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const match = /language-(\w+)/.exec(className || "");
  const codeString = String(children).replace(/\n$/, "");

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    });
  };

  if (!mounted) {
    // Prevent hydration mismatch by not rendering theme-dependent UI on initial server render
    return (
      <div className="relative">
        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
          <code>{codeString}</code>
        </pre>
      </div>
    );
  }

  const currentStyle = theme === "dark" ? vscDarkPlus : lightTheme;
  const codeBgColor = theme === "dark" ? "#1d1f21" : "#f5f5f5"; // Example light theme bg

  return !inline && match ? (
    <div className="relative group">
      <SyntaxHighlighter
        style={currentStyle}
        customStyle={{
          padding: "1rem",
          paddingTop: "2.5rem", // Make space for the button
          margin: "0",
          backgroundColor: codeBgColor,
          borderRadius: "0.375rem", // Corresponds to rounded-md
          fontSize: "0.875rem", // text-sm
        }}
        codeTagProps={{
          style: {
            backgroundColor: "transparent",
            fontFamily: "var(--font-mono)", // Use mono font from globals
          },
        }}
        language={match[1]}
        PreTag="div"
      >
        {codeString}
      </SyntaxHighlighter>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 bg-muted hover:bg-border text-muted-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={isCopied ? "Copied!" : "Copy code"}
      >
        {isCopied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  ) : (
    <code
      className={`${className} text-sm font-mono bg-muted px-1 py-0.5 rounded-sm`}
    >
      {children}
    </code>
  );
};

export default function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center p-4 min-h-full">
        <FilePreview
          src="/omnichat.svg"
          alt="Omnichat Logo"
          className="w-12 h-12 mb-4 flex-shrink-0 rounded-full"
        />
        <p className="text-muted-foreground">
          No messages yet. Send a message to start the conversation!
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-5 min-h-full">
      <AnimatePresence initial={false}>
        {messages.map((item) => {
          if (item.type === "system_prompt_update") {
            const event = item as SystemPromptUpdateEvent;
            return (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="py-2"
              >
                <hr className="border-border my-2" />
                <p className="text-xs text-center text-muted-foreground italic px-4">
                  System prompt updated: &quot;{event.promptContent}&quot;
                </p>
                <hr className="border-border my-2" />
              </motion.div>
            );
          }

          const msg = item as Message;
          return (
            <motion.div
              key={msg.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: msg.sender === "user" ? 20 : -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex items-end space-x-2.5 ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.sender === "bot" && (
                <BotMessageSquare
                  size={28}
                  className="text-primary mb-1 flex-shrink-0 self-start mt-1"
                />
              )}
              <div className="flex flex-col max-w-xl lg:max-w-3xl xl:max-w-4xl">
                <div
                  className={`px-4 py-3 rounded-xl shadow-md border-1 border-slate-300/20
                    ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none shadow-primary/20"
                        : "bg-card text-card-foreground rounded-bl-none shadow-muted/20 prose-chat-message"
                    }
                    text-sm`}
                >
                  {msg.sender === "bot" && msg.isStreaming && !msg.text && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-75"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-150"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-300"></div>
                      <span className="text-xs">Working on it...</span>
                    </div>
                  )}
                  {msg.sender === "bot" ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{ code: CodeBlock }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  )}
                  {msg.sender === "bot" &&
                    msg.thinkingSteps &&
                    msg.thinkingSteps.length > 0 && (
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full mt-2.5 text-xs"
                      >
                        <AccordionItem
                          value={`thinking-${msg.id}`}
                          className="border-t border-border pt-1.5"
                        >
                          <AccordionTrigger className="text-muted-foreground hover:no-underline py-1.5 px-0 text-left">
                            Show Reasoning Process
                          </AccordionTrigger>
                          <AccordionContent className="bg-muted p-2.5 rounded-md mt-1.5">
                            <div className="text-muted-foreground whitespace-pre-wrap text-xs leading-relaxed">
                              {msg.thinkingSteps.join("")}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                </div>
                {msg.timestamp && (
                  <p
                    className={`text-xs mt-1 ${
                      msg.sender === "user"
                        ? "text-muted-foreground text-right"
                        : "text-muted-foreground text-left pl-1"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              {msg.sender === "user" && (
                <User
                  size={28}
                  className="text-primary mb-1 flex-shrink-0 self-start mt-1"
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
