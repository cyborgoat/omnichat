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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useChatStore } from "@/app/store/chatStore";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// Define the schema for API keys using provider names from chatStore
const apiKeySchema = z.object({
  OpenAI: z.string().optional(),
  Google: z.string().optional(), // For Gemini models
  Qwen: z.string().optional(), // For Dashscope/Qwen models
  Deepseek: z.string().optional(), // For Deepseek models
  Anthropic: z.string().optional(), // Added Anthropic for completeness
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

export function ApiKeysSettingsForm() {
  const { apiKeys, setApiKey } = useChatStore();
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>(
    {}
  );

  const apiKeyForm = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    // Load default values using the correct provider names
    defaultValues: {
      OpenAI: apiKeys.OpenAI || "",
      Google: apiKeys.Google || "",
      Qwen: apiKeys.Qwen || "",
      Deepseek: apiKeys.Deepseek || "",
      Anthropic: apiKeys.Anthropic || "",
    },
  });

  function onApiKeySubmit(data: ApiKeyFormValues) {
    // Save API keys using the correct provider names
    if (data.OpenAI !== undefined) setApiKey("OpenAI", data.OpenAI);
    if (data.Google !== undefined) setApiKey("Google", data.Google);
    if (data.Qwen !== undefined) setApiKey("Qwen", data.Qwen);
    if (data.Deepseek !== undefined) setApiKey("Deepseek", data.Deepseek);
    if (data.Anthropic !== undefined) setApiKey("Anthropic", data.Anthropic);
    toast.success("API keys saved!");
  }

  const toggleVisibility = (fieldName: keyof ApiKeyFormValues) => {
    setVisibleFields((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  // Update apiKeyFields to use correct provider names and labels
  const apiKeyFields: {
    name: keyof ApiKeyFormValues;
    label: string;
    description: string;
  }[] = [
    {
      name: "OpenAI",
      label: "OpenAI API Key",
      description: "Enter your OpenAI API Key.",
    },
    {
      name: "Google",
      label: "Google (Gemini) API Key",
      description: "Enter your Google Gemini API Key.",
    },
    {
      name: "Qwen",
      label: "Qwen (Dashscope) API Key",
      description: "Enter your Alibaba Cloud Qwen/Dashscope API Key.",
    },
    {
      name: "Deepseek",
      label: "Deepseek API Key",
      description: "Enter your Deepseek API Key.",
    },
    {
      name: "Anthropic",
      label: "Anthropic API Key",
      description: "Enter your Anthropic API Key.",
    },
  ];

  return (
    <Form {...apiKeyForm}>
      <form
        onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)}
        className="space-y-4"
      >
        <h3 className="text-md font-medium">API Key Management</h3>
        {apiKeyFields.map((item) => (
          <FormField
            key={item.name}
            control={apiKeyForm.control}
            name={item.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs mb-0.5">{item.label}</FormLabel>
                <div className="flex items-center space-x-2">
                  <FormControl>
                    <Input
                      type={visibleFields[item.name] ? "text" : "password"}
                      placeholder={`Enter your ${item.label}`}
                      {...field}
                      value={field.value || ""}
                      className="h-6 placeholder:opacity-60 !text-xs"
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleVisibility(item.name)}
                    className="h-9 w-9 flex-shrink-0"
                  >
                    {visibleFields[item.name] ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </Button>
                </div>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" className="text-xs">Save API Keys</Button>
      </form>
    </Form>
  );
}

export default ApiKeysSettingsForm;
