"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useChatStore } from "@/app/store/chatStore";
import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

// Define the schema for API keys using provider names from chatStore
const apiKeySchema = z.object({
  OpenAI: z.string().optional(),
  Google: z.string().optional(),
  Qwen: z.string().optional(),
  Deepseek: z.string().optional(),
  Anthropic: z.string().optional(),
  Volces: z.string().optional(),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

interface ApiKeysSettingsFormProps {
  setIsDirty: (isDirty: boolean) => void;
}

export function ApiKeysSettingsForm({ setIsDirty }: ApiKeysSettingsFormProps) {
  const { apiKeys, setApiKey } = useChatStore();
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(
    {}
  );

  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      OpenAI: apiKeys.OpenAI || "",
      Google: apiKeys.Google || "",
      Qwen: apiKeys.Qwen || "",
      Deepseek: apiKeys.Deepseek || "",
      Anthropic: apiKeys.Anthropic || "",
      Volces: apiKeys.Volces || "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    const subscription = apiKeyForm.watch(() => setIsDirty(apiKeyForm.formState.isDirty));
    return () => subscription.unsubscribe();
  }, [apiKeyForm, setIsDirty]);

  const onApiKeySubmit = useCallback((data: ApiKeyFormValues) => {
    // Default empty API keys to "None" instead of empty string
    if (data.OpenAI !== undefined) setApiKey("OpenAI", data.OpenAI || "None");
    if (data.Google !== undefined) setApiKey("Google", data.Google || "None");
    if (data.Qwen !== undefined) setApiKey("Qwen", data.Qwen || "None");
    if (data.Deepseek !== undefined) setApiKey("Deepseek", data.Deepseek || "None");
    if (data.Anthropic !== undefined) setApiKey("Anthropic", data.Anthropic || "None");
    if (data.Volces !== undefined) setApiKey("Volces", data.Volces || "None");
    toast.success("API keys saved!");
    setIsDirty(false);
    apiKeyForm.reset(data);
  }, [setApiKey, setIsDirty, apiKeyForm]);

  const onCancel = useCallback(() => {
    apiKeyForm.reset();
    setIsDirty(false);
  }, [apiKeyForm, setIsDirty]);

  // Listen for save/cancel events from parent dialog
  useEffect(() => {
    const handleSaveEvent = (event: CustomEvent) => {
      if (event.detail.tab === 'apiKeys') {
        apiKeyForm.handleSubmit(onApiKeySubmit)();
      }
    };

    const handleCancelEvent = (event: CustomEvent) => {
      if (event.detail.tab === 'apiKeys') {
        onCancel();
      }
    };

    window.addEventListener('settings-save', handleSaveEvent as EventListener);
    window.addEventListener('settings-cancel', handleCancelEvent as EventListener);

    return () => {
      window.removeEventListener('settings-save', handleSaveEvent as EventListener);
      window.removeEventListener('settings-cancel', handleCancelEvent as EventListener);
    };
  }, [apiKeyForm, onApiKeySubmit, onCancel]);

  const toggleVisibility = (fieldName: keyof ApiKeyFormValues) => {
    setVisibleFields((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const apiKeyFields: {
    name: keyof ApiKeyFormValues;
    label: string;
    description: string;
  }[] = [
    { name: "OpenAI", label: "OpenAI", description: "Enter your OpenAI API Key." },
    { name: "Google", label: "Google (Gemini)", description: "Enter your Google Gemini API Key." },
    { name: "Qwen", label: "Qwen (Dashscope)", description: "Enter your Alibaba Cloud Qwen/Dashscope API Key." },
    { name: "Deepseek", label: "Deepseek", description: "Enter your Deepseek API Key." },
    { name: "Anthropic", label: "Anthropic", description: "Enter your Anthropic API Key." },
    { name: "Volces", label: "Volces (Volcengine)", description: "Enter your Volcengine API Key." },
  ];

  return (
    <Form {...apiKeyForm}>
      <form
        onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)}
        className="space-y-4"
      >
        <h3 className="text-md font-medium">API Key Management</h3>
        <ScrollArea className="max-h-[350px] pr-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px] px-4 py-1.5 text-sm font-medium text-muted-foreground sticky top-0 bg-background z-10">Provider</TableHead>
                <TableHead className="px-4 py-1.5 text-sm font-medium text-muted-foreground sticky top-0 bg-background z-10">API Key</TableHead>
                <TableHead className="w-[80px] px-4 py-1.5 text-right text-sm font-medium text-muted-foreground sticky top-0 bg-background z-10">Visibility</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeyFields.map((item) => (
                <TableRow key={item.name} className="hover:bg-muted/50">
                  <TableCell className="px-2 py-1.5 align-middle text-xs">{item.label}</TableCell>
                  <TableCell className="px-2 py-1.5 align-middle">
                    <FormField
                      control={apiKeyForm.control}
                      name={item.name}
                      render={({ field }) => (
                        <FormItem className="m-0 p-0 flex-grow">
                          <FormControl>
                            <Input
                              type={visibleFields[item.name] ? "text" : "password"}
                              placeholder={`Enter API Key`}
                              {...field}
                              value={field.value || ""}
                              className="h-9 w-full rounded-md border px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </FormControl>
                          <FormMessage className="text-xs mt-1" />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell className="px-4 py-1.5 align-middle text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(item.name)}
                      className="h-9 w-9 flex-shrink-0 rounded-full data-[state=open]:bg-muted"
                    >
                      {visibleFields[item.name] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </form>
    </Form>
  );
}

export default ApiKeysSettingsForm;
