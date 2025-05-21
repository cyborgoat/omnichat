"use client";
import { motion } from 'framer-motion';
import { BotMessageSquare } from 'lucide-react';

export default function ThinkingIndicator() {
  return (
    <motion.div 
      className="flex items-end space-x-2 justify-start p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      <BotMessageSquare size={24} className="text-gray-500 mb-1" />
      <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-md bg-gray-100 text-gray-600 text-sm flex items-center">
        Bot is thinking
        <motion.span 
            className="ml-1"
            animate={{
                opacity: [0.5, 1, 0.5],
            }}
            transition={{
                duration: 1,
                repeat: Infinity,
                repeatType: "loop"
            }}
        >
            ...
        </motion.span>
      </div>
    </motion.div>
  );
} 