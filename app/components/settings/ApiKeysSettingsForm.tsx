"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChatStore } from "@/app/store/chatStore";
import { Eye, EyeOff } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

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
    const subscription = apiKeyForm.watch(() =>
      setIsDirty(apiKeyForm.formState.isDirty)
    );
    return () => subscription.unsubscribe();
  }, [apiKeyForm, setIsDirty]);

  const onApiKeySubmit = useCallback(
    (data: ApiKeyFormValues) => {
      // Default empty API keys to "None" instead of empty string
      if (data.OpenAI !== undefined) setApiKey("OpenAI", data.OpenAI || "None");
      if (data.Google !== undefined) setApiKey("Google", data.Google || "None");
      if (data.Qwen !== undefined) setApiKey("Qwen", data.Qwen || "None");
      if (data.Deepseek !== undefined)
        setApiKey("Deepseek", data.Deepseek || "None");
      if (data.Anthropic !== undefined)
        setApiKey("Anthropic", data.Anthropic || "None");
      if (data.Volces !== undefined) setApiKey("Volces", data.Volces || "None");
      toast.success("API keys saved!");
      setIsDirty(false);
      apiKeyForm.reset(data);
    },
    [setApiKey, setIsDirty, apiKeyForm]
  );

  const onCancel = useCallback(() => {
    apiKeyForm.reset();
    setIsDirty(false);
  }, [apiKeyForm, setIsDirty]);

  // Listen for save/cancel events from parent dialog
  useEffect(() => {
    const handleSaveEvent = (event: CustomEvent) => {
      if (event.detail.tab === "apiKeys") {
        apiKeyForm.handleSubmit(onApiKeySubmit)();
      }
    };

    const handleCancelEvent = (event: CustomEvent) => {
      if (event.detail.tab === "apiKeys") {
        onCancel();
      }
    };

    window.addEventListener("settings-save", handleSaveEvent as EventListener);
    window.addEventListener(
      "settings-cancel",
      handleCancelEvent as EventListener
    );

    return () => {
      window.removeEventListener(
        "settings-save",
        handleSaveEvent as EventListener
      );
      window.removeEventListener(
        "settings-cancel",
        handleCancelEvent as EventListener
      );
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
    { name: "OpenAI", label: "OpenAI", description: "For GPT models" },
    {
      name: "Google",
      label: "Google (Gemini)",
      description: "For Gemini models",
    },
    { name: "Qwen", label: "Qwen (Dashscope)", description: "For Qwen models" },
    { name: "Deepseek", label: "Deepseek", description: "For Deepseek models" },
    { name: "Anthropic", label: "Anthropic", description: "For Claude models" },
    {
      name: "Volces",
      label: "Volces (Volcengine)",
      description: "For Volcengine models",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">API Key Management</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Configure your API keys for different AI providers. Leave empty to
          disable a provider.
        </p>
      </div>

      <form
        onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)}
        className="space-y-3"
      >
        <div className="space-y-3">
          {apiKeyFields.map((item) => {
            const fieldValue = apiKeyForm.watch(item.name);
            return (
              <div key={item.name} className="space-y-1">
                <Label htmlFor={item.name} className="text-xs font-medium">
                  {item.label}
                </Label>
                <div className="relative">
                  <Input
                    id={item.name}
                    type={visibleFields[item.name] ? "text" : "password"}
                    placeholder="Enter API key"
                    {...apiKeyForm.register(item.name)}
                    value={fieldValue || ""}
                    onChange={(e) => {
                      apiKeyForm.setValue(item.name, e.target.value);
                      setIsDirty(true);
                    }}
                    className="h-8 text-xs pr-8"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleVisibility(item.name)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  >
                    {visibleFields[item.name] ? (
                      <EyeOff size={12} />
                    ) : (
                      <Eye size={12} />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </form>

      <div className="text-xs text-muted-foreground bg-stone-50 dark:bg-stone-950/20 p-3 rounded-md border border-stone-200 dark:border-stone-800">
        <p className="font-medium mb-1 text-stone-800 dark:text-stone-200">
          💡 Tip:
        </p>
        <p className="text-stone-700 dark:text-stone-300">
          API keys are stored locally in your browser and never sent to external
          servers except the respective AI providers.
        </p>
      </div>
    </div>
  );
}

export default ApiKeysSettingsForm;
