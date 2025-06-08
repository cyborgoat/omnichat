"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useChatStore, Model, CustomModelConfig } from "@/app/store/chatStore";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Brain, ExternalLink, Server, X, Check, AlertTriangle } from "lucide-react";

interface CustomModelsFormProps {
    setIsDirty: (isDirty: boolean) => void;
}

export function CustomModelsForm({ setIsDirty }: CustomModelsFormProps) {
    const {
        customModels,
        addCustomModel,
        updateCustomModel,
        deleteCustomModel,
        setApiKey,
    } = useChatStore();
    const [isFormOpen, setIsFormOpen] = useState(false);
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

            const cleanApiEndpoint = formData.apiEndpoint.replace(/\/v1\/chat\/completions\/?$/, '');

            const customConfig: CustomModelConfig = {
                apiEndpoint: cleanApiEndpoint,
                modelName: formData.modelName,
                supportsStreaming: formData.supportsStreaming,
                supportsThinking: formData.supportsReasoning,
                thinkingParameterName:
                    formData.thinkingParameterName || "enable_thinking",
                defaultTemperature: formData.defaultTemperature,
                defaultMaxTokens: formData.defaultMaxTokens,
                headers,
            };

            const modelId = `${cleanApiEndpoint}||${formData.modelName}`;

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
                toast.success("Custom model updated");
            } else {
                addCustomModel(modelData);
                toast.success("Custom model added");
            }

            setApiKey("Custom", formData.apiKey && formData.apiKey.trim() ? formData.apiKey : "None");

            setIsFormOpen(false);
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
            thinkingParameterName:
                config?.thinkingParameterName || "enable_thinking",
            defaultTemperature: config?.defaultTemperature || 0.7,
            defaultMaxTokens: config?.defaultMaxTokens || 4096,
            headers: config?.headers
                ? JSON.stringify(config.headers, null, 2)
                : "",
            apiKey: "",
        });
        setIsFormOpen(true);
    };

    const handleDelete = (modelId: string) => {
        deleteCustomModel(modelId);
        setIsDirty(true);
        toast.success("Custom model deleted");
    };

    const handleCancel = () => {
        setIsFormOpen(false);
        setEditingModel(null);
        resetForm();
    };

    const handleTestConnection = async (model: Model) => {
        if (!model.customConfig) return;

        try {
            const response = await fetch(
                model.customConfig.apiEndpoint.replace(/\/$/, "") + "/v1/models",
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        ...model.customConfig.headers,
                    },
                }
            );

            if (response.ok) {
                toast.success(`Connection to ${model.name} successful!`);
            } else {
                toast.error(`Connection failed: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            toast.error(`Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-medium">Custom Models</h4>
                    <p className="text-xs text-muted-foreground">
                        Add OpenAI-compatible endpoints (vLLM, Ollama, etc.)
                    </p>
                </div>
                {!isFormOpen && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setEditingModel(null);
                            resetForm();
                            setIsFormOpen(true);
                        }}
                    >
                        <Plus size={16} className="mr-1" />
                        Add Model
                    </Button>
                )}
            </div>

            {isFormOpen && (
                <div className="rounded-lg border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h5 className="text-sm font-medium">
                            {editingModel ? "Edit Custom Model" : "Add Custom Model"}
                        </h5>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancel}
                            className="h-8 w-8 p-0"
                        >
                            <X size={16} />
                        </Button>
                    </div>
                    
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="name" className="text-xs">Display Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, name: e.target.value })
                                    }
                                    placeholder="My Custom Model"
                                    required
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label htmlFor="modelName" className="text-xs">Model Name</Label>
                                <Input
                                    id="modelName"
                                    value={formData.modelName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, modelName: e.target.value })
                                    }
                                    placeholder="model-name"
                                    required
                                    className="mt-1"
                                />
                                <div className="flex items-start gap-1 mt-1">
                                    <AlertTriangle size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-amber-600 dark:text-amber-400">
                                        Must match exactly with the API endpoint's model name
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="apiEndpoint" className="text-xs">API Endpoint</Label>
                            <Input
                                id="apiEndpoint"
                                value={formData.apiEndpoint}
                                onChange={(e) =>
                                    setFormData({ ...formData, apiEndpoint: e.target.value })
                                }
                                placeholder="http://localhost:8000"
                                required
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="apiKey" className="text-xs">API Key (optional)</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                value={formData.apiKey}
                                onChange={(e) =>
                                    setFormData({ ...formData, apiKey: e.target.value })
                                }
                                placeholder="optional api key"
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <Label htmlFor="headers" className="text-xs">Additional Headers (JSON)</Label>
                            <Textarea
                                id="headers"
                                value={formData.headers}
                                onChange={(e) =>
                                    setFormData({ ...formData, headers: e.target.value })
                                }
                                placeholder='{"Authorization": "Bearer token"}'
                                className="mt-1 min-h-[60px]"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Optional headers as JSON object
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="supportsReasoning"
                                    checked={formData.supportsReasoning}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, supportsReasoning: checked })
                                    }
                                />
                                <Label htmlFor="supportsReasoning" className="text-xs">
                                    Reasoning
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="supportsStreaming"
                                    checked={formData.supportsStreaming}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, supportsStreaming: checked })
                                    }
                                />
                                <Label htmlFor="supportsStreaming" className="text-xs">
                                    Streaming
                                </Label>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm">
                                <Check size={16} className="mr-1" />
                                {editingModel ? "Update" : "Add"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {customModels.length === 0 && !isFormOpen ? (
                <div className="rounded-lg border bg-muted/20 p-6 text-center">
                    <Server size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-muted-foreground">No custom models yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Add your first endpoint to get started
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {customModels.map((model) => (
                        <div
                            key={model.id}
                            className="rounded-lg border bg-card p-3 flex items-center justify-between"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h6 className="text-sm font-medium truncate">
                                        {model.name}
                                    </h6>
                                    {model.hasReasoning && (
                                        <Brain size={14} className="text-muted-foreground flex-shrink-0" />
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    <p className="truncate">
                                        {model.customConfig?.apiEndpoint} • {model.customConfig?.modelName}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTestConnection(model)}
                                    className="h-7 w-7 p-0"
                                >
                                    <ExternalLink size={12} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(model)}
                                    className="h-7 w-7 p-0"
                                >
                                    <Edit size={12} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(model.id)}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                >
                                    <Trash2 size={12} />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default CustomModelsForm;
