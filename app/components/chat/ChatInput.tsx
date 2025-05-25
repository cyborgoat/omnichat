"use client";

import {useEffect, useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {FileText, Paperclip, Send, XCircle} from "lucide-react";
import {motion} from "framer-motion";
import {useChatStore} from "@/app/store/chatStore";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_TEXT_TYPES,
  MAX_FILE_SIZE_MB,
  MAX_TOTAL_FILES,
} from "@/app/constants";
import { SelectedFile } from "@/app/types";
import { FilePreview } from "../ui/file-preview";

interface ChatInputProps {
  onSendMessage: (messageText: string, files?: File[]) => void;
  // isSending prop is now sourced from Zustand store directly in this component
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [inputText, setInputText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const isSendingMessage = useChatStore((state) => state.isSendingMessage); // Get isSendingMessage from store

  useEffect(() => {
    return () => {
      selectedFiles.forEach(sf => {
        if (sf.previewUrl) {
          URL.revokeObjectURL(sf.previewUrl);
        }
      });
    };
  }, [selectedFiles]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles: SelectedFile[] = [];
      Array.from(event.target.files).slice(0, MAX_TOTAL_FILES - selectedFiles.length).forEach(file => {
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          console.warn(`File ${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit and was ignored.`);
          // TODO: Show toast notification to user
          return;
        }

        const fileType = file.type;
        let previewUrl: string | undefined = undefined;

        if (ALLOWED_IMAGE_TYPES.includes(fileType)) {
          previewUrl = URL.createObjectURL(file);
        } else if (!ALLOWED_TEXT_TYPES.includes(fileType) && fileType !== "") { // Allow typeless files for now
            // This check is broad, refine if specific text types are strictly needed and others rejected.
          console.warn(`File type "${fileType || 'unknown'}" for ${file.name} is not explicitly supported as text but will be included. Add to ALLOWED_TEXT_TYPES if needed.`);
          // No return, still add it. For a stricter approach, uncomment the following:
          // console.warn(`File type ${fileType} for ${file.name} is not supported and was ignored.`);
          // return;
        }
        
        newFiles.push({ id: crypto.randomUUID(), file, previewUrl });
      });
      
      setSelectedFiles(prev => [...prev, ...newFiles].slice(0, MAX_TOTAL_FILES));
      event.target.value = "";
    }
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const fileToRemove = prev.find(sf => sf.id === fileId);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter(sf => sf.id !== fileId);
    });
  };

  const handleSend = () => {
    const filesToSend = selectedFiles.map(sf => sf.file);
    if (inputText.trim() || filesToSend.length > 0) {
      onSendMessage(inputText, filesToSend);
      setInputText("");
      selectedFiles.forEach(sf => {
        if (sf.previewUrl) URL.revokeObjectURL(sf.previewUrl);
      });
      setSelectedFiles([]);
    }
  };

  const acceptedFileTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_TEXT_TYPES].join(",");

  return (
    <div className="p-3 md:p-4 border-t border-border bg-card text-card-foreground shadow-up">
      {selectedFiles.length > 0 && (
        <div className="mb-3 p-3 border border-border rounded-lg bg-muted">
          <div className="flex flex-wrap gap-3">
            {selectedFiles.map((sf) => (
              <div key={sf.id} className="relative group w-20 h-20 md:w-24 md:h-24 border border-border rounded-md overflow-hidden shadow-sm flex flex-col items-center justify-center bg-background">
                {sf.previewUrl ? (
                  <FilePreview src={sf.previewUrl} alt={sf.file.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-1 text-center">
                    <FileText size={24} className="md:size-32" />
                    <span className="text-xs mt-1 truncate w-full px-1">{sf.file.name}</span>
                  </div>
                )}
                <button 
                  onClick={() => removeFile(sf.id)} 
                  className="absolute top-0.5 right-0.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-px opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                  aria-label="Remove file"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
          {selectedFiles.length >= MAX_TOTAL_FILES && (
            <p className="text-xs text-destructive mt-2">Maximum {MAX_TOTAL_FILES} files allowed.</p>
          )}
        </div>
      )}
      <div className="flex items-center space-x-2">
        <label htmlFor="file-upload" 
          className={`cursor-pointer p-2 rounded-full hover:bg-muted 
          ${selectedFiles.length >= MAX_TOTAL_FILES ? 'opacity-50 cursor-not-allowed' : ''}
          ${isSendingMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Paperclip size={20} className="text-muted-foreground" />
          <input 
            id="file-upload" 
            type="file" 
            multiple 
            className="hidden" 
            onChange={handleFileChange} 
            accept={acceptedFileTypes}
            disabled={selectedFiles.length >= MAX_TOTAL_FILES || isSendingMessage}
          />
        </label>
        <Input
          type="text"
          placeholder={isSendingMessage ? "Waiting for response..." : "Type a message or drop files..."}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isSendingMessage) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isSendingMessage}
          className="flex-1 bg-muted border-border focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground rounded-full px-4 py-2"
        />
        <Button onClick={handleSend} disabled={isSendingMessage || (!inputText.trim() && selectedFiles.length === 0)} className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 aspect-square">
          {isSendingMessage ? (
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} 
              className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" 
            />
          ) : <Send size={20} />}
          <span className="sr-only">{isSendingMessage ? "Sending" : "Send"}</span>
        </Button>
      </div>
    </div>
  );
} 