"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useEffect } from "react";
import { toast } from "sonner";
import { useChatStore } from "@/app/store/chatStore";

// Define the schema for Proxy Settings
const proxySchema = z.object({
  enabled: z.boolean().optional(),
  http: z.string().optional(),
  https: z.string().optional(),
  socks: z.string().optional(),
});

type ProxyFormValues = z.infer<typeof proxySchema>;

interface ProxySettingsFormProps {
  setIsDirty: (isDirty: boolean) => void;
}

export function ProxySettingsForm({ setIsDirty }: ProxySettingsFormProps) {
  const { proxySettings, setProxySettings } = useChatStore();
  
  const proxyForm = useForm<ProxyFormValues>({
    resolver: zodResolver(proxySchema),
    defaultValues: {
      enabled: false,
      http: "",
      https: "",
      socks: "",
    },
    mode: "onChange",
  });

  const isProxyEnabled = proxyForm.watch("enabled");

  useEffect(() => {
    // Load proxy settings from store
    proxyForm.reset({
      enabled: proxySettings.enabled ?? false,
      http: proxySettings.http || "",
      https: proxySettings.https || "",
      socks: proxySettings.socks || "",
    });
  }, [proxyForm, proxySettings]);

  useEffect(() => {
    const subscription = proxyForm.watch(() => setIsDirty(proxyForm.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [proxyForm, setIsDirty]);

  function onProxySubmit(data: ProxyFormValues) {
    // Filter out empty strings and include enabled flag
    const cleanedData = {
      enabled: data.enabled ?? false,
      ...(data.http && data.http.trim() && { http: data.http.trim() }),
      ...(data.https && data.https.trim() && { https: data.https.trim() }),
      ...(data.socks && data.socks.trim() && { socks: data.socks.trim() }),
    };
    
    setProxySettings(cleanedData);
    toast.success("Proxy settings saved!");
    setIsDirty(false);
    proxyForm.reset(cleanedData);
  }

  function clearProxySettings() {
    setProxySettings({});
    proxyForm.reset({
      enabled: false,
      http: "",
      https: "",
      socks: "",
    });
    toast.success("Proxy settings cleared!");
    setIsDirty(false);
  }

  return (
    <Form {...proxyForm}>
      <form onSubmit={proxyForm.handleSubmit(onProxySubmit)} className="space-y-4 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-medium">Proxy Settings</h3>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={clearProxySettings}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
        
        <FormField
          control={proxyForm.control}
          name="enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">
                  Enable Proxy
                </FormLabel>
                <FormDescription className="text-xs text-muted-foreground">
                  Turn proxy on or off for all API calls
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <FormField
          control={proxyForm.control}
          name="http"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs mb-0.5">HTTP Proxy</FormLabel>
              <FormControl>
                <Input 
                  placeholder="http://127.0.0.1:8080" 
                  {...field} 
                  value={field.value || ""} 
                  disabled={!isProxyEnabled}
                  className="text-xs placeholder:opacity-60 h-8 px-2 py-1" 
                />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                HTTP proxy URL (e.g., http://127.0.0.1:8080)
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        
        <FormField
          control={proxyForm.control}
          name="https"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs mb-0.5">HTTPS Proxy</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://127.0.0.1:8080" 
                  {...field} 
                  value={field.value || ""} 
                  disabled={!isProxyEnabled}
                  className="text-xs placeholder:opacity-60 h-8 px-2 py-1" 
                />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                HTTPS proxy URL (e.g., https://127.0.0.1:8080)
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        
        <FormField
          control={proxyForm.control}
          name="socks"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs mb-0.5">SOCKS Proxy</FormLabel>
              <FormControl>
                <Input 
                  placeholder="socks5://127.0.0.1:7890" 
                  {...field} 
                  value={field.value || ""} 
                  disabled={!isProxyEnabled}
                  className="text-xs placeholder:opacity-60 h-8 px-2 py-1" 
                />
              </FormControl>
              <FormDescription className="text-xs text-muted-foreground">
                SOCKS proxy URL (e.g., socks5://127.0.0.1:7890)
              </FormDescription>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        
        <div className="pt-2">
          <Button type="submit" className="text-xs" disabled={!proxyForm.formState.isDirty}>Save Proxy Settings</Button>
        </div>
        
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
          <p className="font-medium mb-1">Note:</p>
          <p>• SOCKS proxy takes priority over HTTP/HTTPS proxies</p>
          <p>• Leave fields empty to disable proxy for that protocol</p>
          <p>• Proxy settings apply to all model providers (OpenAI, Anthropic, Gemini, Deepseek, Qwen)</p>
        </div>
      </form>
    </Form>
  );
}

export default ProxySettingsForm; 