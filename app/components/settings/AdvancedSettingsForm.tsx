"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useChatStore } from "@/app/store/chatStore";
import { Trash2, RefreshCw, AlertTriangle } from "lucide-react";

// Define the schema for advanced settings
const advancedSchema = z.object({
  clearApiKeys: z.boolean(),
  clearProxySettings: z.boolean(),
  clearEnabledModels: z.boolean(),
  clearChatSessions: z.boolean(),
  clearGlobalSystemPrompt: z.boolean(),
  clearAll: z.boolean(),
});

type AdvancedFormValues = z.infer<typeof advancedSchema>;

interface AdvancedSettingsFormProps {
  setIsDirty: (isDirty: boolean) => void;
}

export function AdvancedSettingsForm({ setIsDirty }: AdvancedSettingsFormProps) {
  const [isClearing, setIsClearing] = useState(false);
  const { 
    apiKeys, 
    proxySettings, 
    enabledModelIds, 
    chatSessions, 
    globalSystemPrompt,
    setApiKey,
    setProxySettings,
    setEnabledModels,
    setGlobalSystemPrompt,
    availableModels
  } = useChatStore();

  const form = useForm<AdvancedFormValues>({
    resolver: zodResolver(advancedSchema),
    defaultValues: {
      clearApiKeys: false,
      clearProxySettings: false,
      clearEnabledModels: false,
      clearChatSessions: false,
      clearGlobalSystemPrompt: false,
      clearAll: false,
    },
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === 'change') {
        setIsDirty(form.formState.isDirty);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, setIsDirty]);

  const clearAll = form.watch("clearAll");

  const handleClearAllChange = (checked: boolean) => {
    form.setValue("clearAll", checked);
    form.setValue("clearApiKeys", checked);
    form.setValue("clearProxySettings", checked);
    form.setValue("clearEnabledModels", checked);
    form.setValue("clearChatSessions", checked);
    form.setValue("clearGlobalSystemPrompt", checked);
    setIsDirty(true);
  };

  const onSubmit = async (data: AdvancedFormValues) => {
    setIsClearing(true);
    
    try {
      const clearedSections: string[] = [];

      if (data.clearAll) {
        localStorage.removeItem('omnichat-storage');
        toast.success("All data cleared! Reloading application...");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      }

      if (data.clearApiKeys) {
        Object.keys(apiKeys).forEach(provider => {
          setApiKey(provider, '');
        });
        clearedSections.push("API Keys");
      }

      if (data.clearProxySettings) {
        setProxySettings({});
        clearedSections.push("Proxy Settings");
      }

      if (data.clearEnabledModels) {
        setEnabledModels(availableModels.map(m => m.id));
        clearedSections.push("Model Selection");
      }

      if (data.clearChatSessions) {
        useChatStore.setState({
          chatSessions: [],
          activeChatSessionId: null,
        });
        clearedSections.push("Chat Sessions");
      }

      if (data.clearGlobalSystemPrompt) {
        setGlobalSystemPrompt("You are a helpful AI assistant. Respond in Markdown format.");
        clearedSections.push("Global System Prompt");
      }

      if (clearedSections.length > 0) {
        toast.success(`Cleared: ${clearedSections.join(", ")}`);
        form.reset();
        setIsDirty(false);
      } else {
        toast.info("No sections selected for clearing");
        setIsDirty(false);
      }

    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Failed to clear data. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const getDataSummary = () => {
    const apiKeyCount = Object.keys(apiKeys).filter(key => apiKeys[key]).length;
    const hasProxy = Object.keys(proxySettings).length > 0;
    const enabledModelCount = enabledModelIds.length;
    const chatSessionCount = chatSessions.length;
    const hasCustomPrompt = globalSystemPrompt !== "You are a helpful AI assistant. Respond in Markdown format.";

    return {
      apiKeyCount,
      hasProxy,
      enabledModelCount,
      chatSessionCount,
      hasCustomPrompt,
    };
  };

  const summary = getDataSummary();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h3 className="text-md font-medium">Advanced Settings</h3>
        </div>
        
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md mb-4">
          <p className="font-medium mb-2">Current Data Summary:</p>
          <ul className="space-y-1 text-xs">
            <li>• API Keys: {summary.apiKeyCount} configured</li>
            <li>• Proxy Settings: {summary.hasProxy ? "Configured" : "Not configured"}</li>
            <li>• Enabled Models: {summary.enabledModelCount} of {availableModels.length}</li>
            <li>• Chat Sessions: {summary.chatSessionCount} sessions</li>
            <li>• System Prompt: {summary.hasCustomPrompt ? "Custom" : "Default"}</li>
          </ul>
        </div>

        <FormField
          control={form.control}
          name="clearAll"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-destructive/20 p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={handleClearAllChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-sm font-medium text-destructive">
                  Clear All Data & Reload App
                </FormLabel>
                <FormDescription className="text-xs">
                  This will completely reset the application to its initial state and reload the page.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <p className="text-sm font-medium">Or select specific sections to clear:</p>
          
          <FormField
            control={form.control}
            name="clearApiKeys"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value || clearAll}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!clearAll) setIsDirty(true);
                    }}
                    disabled={clearAll}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm">API Keys ({summary.apiKeyCount} configured)</FormLabel>
                  <FormDescription className="text-xs">
                    Clear all saved API keys for all providers
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clearProxySettings"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value || clearAll}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!clearAll) setIsDirty(true);
                    }}
                    disabled={clearAll}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm">Proxy Settings</FormLabel>
                  <FormDescription className="text-xs">
                    Reset proxy configuration to default (disabled)
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clearEnabledModels"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value || clearAll}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!clearAll) setIsDirty(true);
                    }}
                    disabled={clearAll}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm">Model Selection ({summary.enabledModelCount} enabled)</FormLabel>
                  <FormDescription className="text-xs">
                    Reset to all models enabled
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clearChatSessions"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value || clearAll}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!clearAll) setIsDirty(true);
                    }}
                    disabled={clearAll}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm text-destructive">Chat Sessions ({summary.chatSessionCount} sessions)</FormLabel>
                  <FormDescription className="text-xs">
                    ⚠️ This will permanently delete all your chat history
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clearGlobalSystemPrompt"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value || clearAll}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!clearAll) setIsDirty(true);
                    }}
                    disabled={clearAll}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm">Global System Prompt</FormLabel>
                  <FormDescription className="text-xs">
                    Reset to default system prompt
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="pt-4 flex gap-2">
          <Button 
            type="submit" 
            variant="destructive" 
            disabled={isClearing || !form.formState.isDirty}
            className="flex items-center gap-2"
          >
            {isClearing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {isClearing ? "Clearing..." : "Clear Selected Data"}
          </Button>
          
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => form.reset()}
            disabled={isClearing}
          >
            Reset Form
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
          <p className="font-medium mb-1 text-yellow-800 dark:text-yellow-200">⚠️ Warning:</p>
          <p className="text-yellow-700 dark:text-yellow-300">
            These actions cannot be undone. Make sure you have backed up any important data before proceeding.
          </p>
        </div>
      </form>
    </Form>
  );
}

export default AdvancedSettingsForm; 