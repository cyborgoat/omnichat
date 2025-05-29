"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { useChatStore, ProxySettings } from "@/app/store/chatStore";
import { Trash2, RefreshCw, AlertTriangle, Globe, Save, Database } from "lucide-react";

// Separate schemas for different form sections
const proxySchema = z.object({
  proxyEnabled: z.boolean(),
  httpProxy: z.string().optional(),
  httpsProxy: z.string().optional(),
  socks5Proxy: z.string().optional(),
});

const dataManagementSchema = z.object({
  clearApiKeys: z.boolean(),
  clearEnabledModels: z.boolean(),
  clearChatSessions: z.boolean(),
  clearGlobalSystemPrompt: z.boolean(),
  clearAll: z.boolean(),
});

type ProxyFormValues = z.infer<typeof proxySchema>;
type DataManagementFormValues = z.infer<typeof dataManagementSchema>;

interface AdvancedSettingsFormProps {
  setIsDirty: (isDirty: boolean) => void;
}

export function AdvancedSettingsForm({ setIsDirty }: AdvancedSettingsFormProps) {
  const [isSavingProxy, setIsSavingProxy] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const { 
    apiKeys, 
    enabledModelIds, 
    chatSessions, 
    globalSystemPrompt,
    proxySettings,
    setApiKey,
    setGlobalSystemPrompt,
    setProxySettings,
    availableModels,
    syncAvailableModels
  } = useChatStore();

  // Proxy settings form
  const proxyForm = useForm<ProxyFormValues>({
    resolver: zodResolver(proxySchema),
    defaultValues: {
      proxyEnabled: proxySettings.enabled,
      httpProxy: proxySettings.http || '',
      httpsProxy: proxySettings.https || '',
      socks5Proxy: proxySettings.socks5 || '',
    },
    mode: "onChange",
  });

  // Data management form
  const dataForm = useForm<DataManagementFormValues>({
    resolver: zodResolver(dataManagementSchema),
    defaultValues: {
      clearApiKeys: false,
      clearEnabledModels: false,
      clearChatSessions: false,
      clearGlobalSystemPrompt: false,
      clearAll: false,
    },
    mode: "onChange",
  });

  // Track proxy form changes
  useEffect(() => {
    const subscription = proxyForm.watch(() => {
      setIsDirty(proxyForm.formState.isDirty);
    });
    return () => subscription.unsubscribe();
  }, [proxyForm, setIsDirty]);

  // Handle proxy settings save
  const onSaveProxy = async (data: ProxyFormValues) => {
    setIsSavingProxy(true);
    
    try {
      const newProxySettings: ProxySettings = {
        enabled: data.proxyEnabled,
        http: data.httpProxy?.trim() || undefined,
        https: data.httpsProxy?.trim() || undefined,
        socks5: data.socks5Proxy?.trim() || undefined,
      };
      
      setProxySettings(newProxySettings);
      proxyForm.reset(data); // Reset form dirty state
      setIsDirty(false);
      toast.success("Proxy settings saved successfully!");
    } catch (error) {
      console.error("Error saving proxy settings:", error);
      toast.error("Failed to save proxy settings. Please try again.");
    } finally {
      setIsSavingProxy(false);
    }
  };

  // Handle data clearing operations
  const onClearData = async (data: DataManagementFormValues) => {
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

      if (data.clearEnabledModels) {
        syncAvailableModels();
        clearedSections.push("Model Selection (synced with latest)");
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
        dataForm.reset();
      } else {
        toast.info("No sections selected for clearing");
      }

    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Failed to clear data. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  const clearAll = dataForm.watch("clearAll");

  const handleClearAllChange = (checked: boolean) => {
    dataForm.setValue("clearAll", checked);
    dataForm.setValue("clearApiKeys", checked);
    dataForm.setValue("clearEnabledModels", checked);
  };

  const getDataSummary = () => {
    const apiKeyCount = Object.keys(apiKeys).filter(key => apiKeys[key]).length;
    const enabledModelCount = enabledModelIds.length;
    const chatSessionCount = chatSessions.length;
    const hasCustomPrompt = globalSystemPrompt !== "You are a helpful AI assistant. Respond in Markdown format.";

    return {
      apiKeyCount,
      enabledModelCount,
      chatSessionCount,
      hasCustomPrompt,
    };
  };

  const summary = getDataSummary();

  // Check if proxy settings have changed
  const proxySettingsChanged = 
    proxyForm.getValues("proxyEnabled") !== proxySettings.enabled ||
    (proxyForm.getValues("httpProxy") || '') !== (proxySettings.http || '') ||
    (proxyForm.getValues("httpsProxy") || '') !== (proxySettings.https || '') ||
    (proxyForm.getValues("socks5Proxy") || '') !== (proxySettings.socks5 || '');

  // Determine if any clear action is selected
  const anyClearActionSelected = dataForm.watch("clearAll") || 
                                 dataForm.watch("clearApiKeys") || 
                                 dataForm.watch("clearEnabledModels") || 
                                 dataForm.watch("clearChatSessions") || 
                                 dataForm.watch("clearGlobalSystemPrompt");

  return (
    <div className="space-y-8 py-4">
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-medium">Advanced Settings</h3>
      </div>

      {/* Proxy Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-blue-500" />
          <h4 className="text-md font-medium">Network & Proxy Settings</h4>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <Form {...proxyForm}>
            <form onSubmit={proxyForm.handleSubmit(onSaveProxy)} className="space-y-4">
              <FormField
                control={proxyForm.control}
                name="proxyEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">Enable Proxy</FormLabel>
                      <FormDescription className="text-xs text-muted-foreground">
                        Route server-side API requests through a proxy server
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {proxyForm.watch("proxyEnabled") && (
                <div className="space-y-4 ml-6 p-4 bg-white dark:bg-gray-900 rounded-md border">
                  <FormField
                    control={proxyForm.control}
                    name="httpProxy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">HTTP Proxy</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="http://proxy.example.com:8080"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          HTTP proxy URL for non-secure connections
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={proxyForm.control}
                    name="httpsProxy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">HTTPS Proxy</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://proxy.example.com:8080"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          HTTPS proxy URL for secure connections
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={proxyForm.control}
                    name="socks5Proxy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">SOCKS5 Proxy</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="socks5://proxy.example.com:1080"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          SOCKS5 proxy URL (recommended for better compatibility)
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 p-3 rounded-md">
                    <p className="font-medium mb-1">💡 Priority Order:</p>
                    <p>If multiple proxies are configured, they will be used in this order: SOCKS5 → HTTPS → HTTP</p>
                  </div>

                  <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-md mt-2">
                    <p className="font-medium mb-1">⚠️ SOCKS5 Compatibility Note:</p>
                    <p>If SOCKS5 proxy fails, try using HTTP proxy instead. Many SOCKS5 proxies also support HTTP protocol on port 8080 or similar.</p>
                    <p className="mt-1">Example: If SOCKS5 is socks5://127.0.0.1:7890, try HTTP as http://127.0.0.1:7890</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  disabled={isSavingProxy || !proxySettingsChanged}
                  className="flex items-center gap-2"
                >
                  {isSavingProxy ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSavingProxy ? "Saving..." : "Save Proxy Settings"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => proxyForm.reset()}
                  disabled={isSavingProxy}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>

      <Separator />

      {/* Data Management Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-red-500" />
          <h4 className="text-md font-medium">Data Management</h4>
        </div>

        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md mb-4">
          <p className="font-medium mb-2">Current Data Summary:</p>
          <ul className="space-y-1 text-xs">
            <li>• API Keys: {summary.apiKeyCount} configured</li>
            <li>• Enabled Models: {summary.enabledModelCount} of {availableModels.length}</li>
            <li>• Chat Sessions: {summary.chatSessionCount} sessions</li>
            <li>• System Prompt: {summary.hasCustomPrompt ? "Custom" : "Default"}</li>
            <li>• Proxy: {proxySettings.enabled ? "Enabled" : "Disabled"}</li>
          </ul>
        </div>

        <Form {...dataForm}>
          <form onSubmit={dataForm.handleSubmit(onClearData)} className="space-y-4">
            <FormField
              control={dataForm.control}
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
                control={dataForm.control}
                name="clearApiKeys"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || clearAll}
                        onCheckedChange={field.onChange}
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
                control={dataForm.control}
                name="clearEnabledModels"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || clearAll}
                        onCheckedChange={field.onChange}
                        disabled={clearAll}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">Model Selection & Sync ({summary.enabledModelCount} enabled)</FormLabel>
                      <FormDescription className="text-xs">
                        Reset to all models enabled and sync with latest available models
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={dataForm.control}
                name="clearChatSessions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || clearAll}
                        onCheckedChange={field.onChange}
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
                control={dataForm.control}
                name="clearGlobalSystemPrompt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value || clearAll}
                        onCheckedChange={field.onChange}
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
                disabled={isClearing || !anyClearActionSelected}
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
                onClick={() => dataForm.reset()}
                disabled={isClearing}
              >
                Reset Form
              </Button>
            </div>
          </form>
        </Form>

        <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
          <p className="font-medium mb-1 text-yellow-800 dark:text-yellow-200">⚠️ Warning:</p>
          <p className="text-yellow-700 dark:text-yellow-300">
            Data clearing actions cannot be undone. Make sure you have backed up any important data before proceeding.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdvancedSettingsForm; 