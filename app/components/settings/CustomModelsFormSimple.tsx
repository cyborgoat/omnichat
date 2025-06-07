"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useChatStore, Model, CustomModelConfig } from "@/app/store/chatStore";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Brain, ExternalLink, Server } from "lucide-react";

interface CustomModelsFormProps {
  setIsDirty: (isDirty: boolean) => void;
}

export function CustomModelsForm({ setIsDirty }: CustomModelsFormProps) {
  const { customModels, addCustomModel, updateCustomModel, deleteCustomModel, setApiKey } = useChatStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    apiEndpoint: "",
    modelName: "",
    apiKey: "",
    supportsReasoning: false,
    supportsStreaming: true,
    thinkingParameterName: "enable_thinking",
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
    headers: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      apiEndpoint: "",
      modelName: "",
      apiKey: "",
      supportsReasoning: false,
      supportsStreaming: true,
      thinkingParameterName: "enable_thinking",
      defaultTemperature: 0.7,
      defaultMaxTokens: 4096,
      headers: "",
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let headers: Record<string, string> = {};
      if (formData.headers && formData.headers.trim()) {
        try {
          headers = JSON.parse(formData.headers);
        } catch {
          toast.error("Invalid JSON format for headers");
          return;
        }
      }

      const customConfig: CustomModelConfig = {
        apiEndpoint: formData.apiEndpoint,
        modelName: formData.modelName,
        supportsStreaming: formData.supportsStreaming,
        supportsThinking: formData.supportsReasoning,
        thinkingParameterName: formData.thinkingParameterName || 'enable_thinking',
        defaultTemperature: formData.defaultTemperature,
        defaultMaxTokens: formData.defaultMaxTokens,
        headers,
      };

      // Create a stable ID based on the model name (slug-ified)
      const modelId = editingModel?.id || `custom-${formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
      
      const modelData: Model = {
        id: modelId,
        name: formData.name,
        provider: "Custom",
        apiKeyRequired: true,
        hasReasoning: formData.supportsReasoning,
        isCustom: true,
        customConfig,
      };

      if (editingModel) {
        updateCustomModel(editingModel.id, modelData);
      } else {
        addCustomModel(modelData);
      }

      // Save API key if provided
      if (formData.apiKey && formData.apiKey.trim()) {
        setApiKey("Custom", formData.apiKey);
      }

      setIsDialogOpen(false);
      setEditingModel(null);
      resetForm();
      setIsDirty(true);
    } catch (error) {
      toast.error("Failed to save custom model");
      console.error(error);
    }
  };

  const handleEdit = (model: Model) => {
    setEditingModel(model);
    const config = model.customConfig;
    setFormData({
      name: model.name,
      apiEndpoint: config?.apiEndpoint || "",
      modelName: config?.modelName || "",
      supportsReasoning: model.hasReasoning || false,
      supportsStreaming: config?.supportsStreaming !== false,
      thinkingParameterName: config?.thinkingParameterName || "enable_thinking",
      defaultTemperature: config?.defaultTemperature || 0.7,
      defaultMaxTokens: config?.defaultMaxTokens || 4096,
      headers: config?.headers ? JSON.stringify(config.headers, null, 2) : "",
      apiKey: "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (modelId: string) => {
    deleteCustomModel(modelId);
    setIsDirty(true);
  };

  const handleTestConnection = async (model: Model) => {
    if (!model.customConfig) return;
    
    try {
      const response = await fetch(model.customConfig.apiEndpoint.replace(/\/$/, '') + '/v1/models', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...model.customConfig.headers,
        },
      });
      
      if (response.ok) {
        toast.success(`Connection to ${model.name} successful!`);
      } else {
        toast.error(`Connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      toast.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-md font-medium">Custom Models</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Add your own OpenAI-compatible API endpoints (vLLM, Ollama, etc.)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setEditingModel(null);
                resetForm();
              }}
            >
              <Plus size={16} className="mr-1" />
              Add Model
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? "Edit Custom Model" : "Add Custom Model"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="My Custom Model"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="modelName">Model Name (API)</Label>
                  <Input
                    id="modelName"
                    value={formData.modelName}
                    onChange={(e) => setFormData({...formData, modelName: e.target.value})}
                    placeholder="Qwen/Qwen3-1.7B"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Model name to send in API requests
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="apiEndpoint">API Endpoint URL</Label>
                <Input
                  id="apiEndpoint"
                  value={formData.apiEndpoint}
                  onChange={(e) => setFormData({...formData, apiEndpoint: e.target.value})}
                  placeholder="http://localhost:8000"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Base URL for the OpenAI-compatible API (without /v1/chat/completions)
                </p>
              </div>

              <div>
                <Label htmlFor="apiKey">API Key (Optional)</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                  placeholder="Enter API key if required"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty if the endpoint doesn&apos;t require authentication
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="supportsReasoning"
                      checked={formData.supportsReasoning}
                      onCheckedChange={(checked) => setFormData({...formData, supportsReasoning: checked})}
                    />
                    <div>
                      <Label htmlFor="supportsReasoning">Supports Reasoning/Thinking</Label>
                      <p className="text-xs text-muted-foreground">
                        Model can show thinking process
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="supportsStreaming"
                      checked={formData.supportsStreaming}
                      onCheckedChange={(checked) => setFormData({...formData, supportsStreaming: checked})}
                    />
                    <div>
                      <Label htmlFor="supportsStreaming">Supports Streaming</Label>
                      <p className="text-xs text-muted-foreground">
                        Real-time response streaming
                      </p>
                    </div>
                  </div>

                  {formData.supportsReasoning && (
                    <div>
                      <Label htmlFor="thinkingParameterName">Thinking Parameter Name</Label>
                      <Input
                        id="thinkingParameterName"
                        value={formData.thinkingParameterName}
                        onChange={(e) => setFormData({...formData, thinkingParameterName: e.target.value})}
                        placeholder="enable_thinking"
                        className="text-xs"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Parameter name for enabling thinking (default: enable_thinking)
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="defaultTemperature">Default Temperature</Label>
                    <Input
                      id="defaultTemperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={formData.defaultTemperature}
                      onChange={(e) => setFormData({...formData, defaultTemperature: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="defaultMaxTokens">Default Max Tokens</Label>
                    <Input
                      id="defaultMaxTokens"
                      type="number"
                      min="1"
                      value={formData.defaultMaxTokens}
                      onChange={(e) => setFormData({...formData, defaultMaxTokens: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="headers">Additional Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  value={formData.headers}
                  onChange={(e) => setFormData({...formData, headers: e.target.value})}
                  placeholder='{"Authorization": "Bearer token", "Custom-Header": "value"}'
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional additional headers as JSON object
                </p>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingModel ? "Update Model" : "Add Model"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customModels.length === 0 ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 pt-6">
            <div className="text-center text-muted-foreground">
              <Server size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-sm">No custom models configured yet.</p>
              <p className="text-xs mt-1">Add your first OpenAI-compatible endpoint to get started!</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {customModels.map((model) => (
            <div key={model.id} className="rounded-lg border bg-card text-card-foreground shadow-sm relative">
              <div className="flex flex-col space-y-1.5 p-6 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">
                      {model.name}
                      {model.hasReasoning && (
                        <Brain size={16} className="inline ml-1 text-slate-600 dark:text-slate-400" />
                      )}
                    </h3>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      Custom
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestConnection(model)}
                      className="h-7 w-7 p-0"
                    >
                      <ExternalLink size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(model)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(model.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Endpoint:</strong> {model.customConfig?.apiEndpoint}</p>
                  <p><strong>Model:</strong> {model.customConfig?.modelName}</p>
                  <div className="flex gap-2 mt-2">
                    {model.customConfig?.supportsStreaming && (
                      <span className="text-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Streaming</span>
                    )}
                    {model.customConfig?.supportsThinking && (
                      <span className="text-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">Thinking</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomModelsForm; 