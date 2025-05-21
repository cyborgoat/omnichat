import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BotMessageSquare, User } from 'lucide-react';
import { Message } from "@/app/store/chatStore";
import { AnimatePresence, motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageListProps {
  messages: Message[];
}

// Reverting to a simpler props type for CodeBlock to avoid complex linter errors.
// The essential functionality is in how SyntaxHighlighter is called.
interface CodeBlockProps {
  node?: any; 
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any; 
}

const CodeBlock = ({ node: _node, inline, className, children, ...props }: CodeBlockProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const match = /language-(\w+)/.exec(className || '');
  return !inline && match ? (
    <SyntaxHighlighter
      style={vscDarkPlus}
      customStyle={{ 
        padding: '1rem', 
        margin: '0',
        backgroundColor: '#1d1f21'
      }}
      codeTagProps={{ style: { backgroundColor: 'transparent' } }}
      language={match[1]}
      PreTag="div" 
      {...props}
    >
      {String(children).replace(/\n$/, '')}
    </SyntaxHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};

export default function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
        <BotMessageSquare size={48} className="text-gray-400 dark:text-gray-500 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">
          No messages yet. Send a message to start the conversation!
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-5 p-1 md:p-4 flex-grow">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`flex items-end space-x-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <BotMessageSquare size={28} className="text-indigo-500 mb-1 flex-shrink-0 self-start mt-1" />
            )}
            <div
              className={`max-w-xl lg:max-w-3xl xl:max-w-4xl px-4 py-3 rounded-xl shadow-md 
                ${msg.sender === "user"
                  ? "bg-blue-600 text-white rounded-br-none shadow-blue-200/50 dark:shadow-blue-900/50 not-prose" 
                  : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-gray-300/50 dark:shadow-gray-900/50 prose-chat-message dark:prose-invert"}`}
            >
              {msg.sender === "bot" && msg.isStreaming && !msg.text && (
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                  <span className="text-xs">Assistant is typing...</span>
                </div>
              )}
              {msg.sender === 'bot' ? (
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
              {msg.sender === "bot" && msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-2.5 text-xs">
                  <AccordionItem value={`thinking-${msg.id}`} className="border-t border-gray-300 dark:border-gray-600 pt-1.5">
                    <AccordionTrigger className="text-gray-600 dark:text-gray-400 hover:no-underline py-1.5 px-0 text-left">
                      Show Reasoning ({msg.thinkingSteps.length} steps)
                    </AccordionTrigger>
                    <AccordionContent className="bg-gray-50 dark:bg-gray-600/50 p-2.5 rounded-md mt-1.5">
                      <ul className="list-decimal list-inside space-y-1.5 text-gray-700 dark:text-gray-300">
                        {msg.thinkingSteps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {msg.timestamp && (
                  <p className={`text-xs mt-1.5 ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'} text-right`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
              )}
            </div>
            {msg.sender === "user" && (
              <User size={28} className="text-blue-500 mb-1 flex-shrink-0 self-start mt-1" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
} 