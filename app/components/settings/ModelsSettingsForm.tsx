"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useChatStore } from "@/app/store/chatStore";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface ModelsSettingsFormProps {
  setIsDirty: (isDirty: boolean) => void;
}

export function ModelsSettingsForm({ setIsDirty }: ModelsSettingsFormProps) {
  const { availableModels, enabledModelIds, setEnabledModels } = useChatStore();
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(enabledModelIds);

  useEffect(() => {
    setSelectedModelIds(enabledModelIds);
  }, [enabledModelIds]);

  // Group models by provider
  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof availableModels>);

  const handleModelToggle = (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModelIds(prev => [...prev, modelId]);
    } else {
      setSelectedModelIds(prev => prev.filter(id => id !== modelId));
    }
    setIsDirty(true);
  };

  const handleSelectAll = () => {
    setSelectedModelIds(availableModels.map(m => m.id));
    setIsDirty(true);
  };

  const handleDeselectAll = () => {
    setSelectedModelIds([]);
    setIsDirty(true);
  };

  const handleProviderToggle = (provider: string, checked: boolean) => {
    const providerModelIds = groupedModels[provider].map(m => m.id);
    if (checked) {
      setSelectedModelIds(prev => [...new Set([...prev, ...providerModelIds])]);
    } else {
      setSelectedModelIds(prev => prev.filter(id => !providerModelIds.includes(id)));
    }
    setIsDirty(true);
  };

  const handleSave = () => {
    if (selectedModelIds.length === 0) {
      toast.error("Please select at least one model.");
      return;
    }
    setEnabledModels(selectedModelIds);
    toast.success("Model settings saved!");
    setIsDirty(false);
  };

  const hasChanges = JSON.stringify(selectedModelIds.sort()) !== JSON.stringify(enabledModelIds.sort());

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-medium">Active Models</h3>
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleSelectAll}
            className="text-xs"
          >
            Select All
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleDeselectAll}
            className="text-xs"
          >
            Deselect All
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Choose which models appear in the sidebar model selection menu. Only selected models will be available for new chats.
      </p>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(groupedModels).map(([provider, models]) => {
          const providerModelIds = models.map(m => m.id);
          const selectedProviderModels = selectedModelIds.filter(id => providerModelIds.includes(id));
          const isProviderFullySelected = selectedProviderModels.length === providerModelIds.length;
          const isProviderPartiallySelected = selectedProviderModels.length > 0 && selectedProviderModels.length < providerModelIds.length;

          return (
            <div key={provider} className="space-y-2">
              <div className="flex items-center space-x-2 pb-1 border-b border-border">
                <Checkbox
                  id={`provider-${provider}`}
                  checked={isProviderFullySelected}
                  ref={(el) => {
                    if (el) {
                      // Access the underlying input element for indeterminate state
                      const input = el.querySelector('input');
                      if (input) input.indeterminate = isProviderPartiallySelected;
                    }
                  }}
                  onCheckedChange={(checked) => handleProviderToggle(provider, checked as boolean)}
                />
                <label 
                  htmlFor={`provider-${provider}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {provider} ({selectedProviderModels.length}/{providerModelIds.length})
                </label>
              </div>
              
              <div className="pl-6 space-y-2">
                {models.map((model) => (
                  <div key={model.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={model.id}
                      checked={selectedModelIds.includes(model.id)}
                      onCheckedChange={(checked) => handleModelToggle(model.id, checked as boolean)}
                    />
                    <label 
                      htmlFor={model.id}
                      className="text-xs cursor-pointer flex-1"
                    >
                      {model.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {selectedModelIds.length} of {availableModels.length} models selected
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || selectedModelIds.length === 0}
          className="text-xs"
        >
          Save Model Settings
        </Button>
      </div>
    </div>
  );
}

export default ModelsSettingsForm; 