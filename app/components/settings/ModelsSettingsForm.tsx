"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useChatStore } from "@/app/store/chatStore";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { Brain } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import CustomModelsForm from "./CustomModelsFormSimple";

interface ModelsSettingsFormProps {
  setIsDirty: (isDirty: boolean) => void;
}

export function ModelsSettingsForm({ setIsDirty }: ModelsSettingsFormProps) {
  const { availableModels, customModels, enabledModelIds, setEnabledModels } = useChatStore();
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(enabledModelIds);

  useEffect(() => {
    setSelectedModelIds(enabledModelIds);
  }, [enabledModelIds]);

  // Group standard models by provider (exclude custom models from this section)
  const standardModels = availableModels;
  const groupedStandardModels = standardModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof standardModels>);

  const allModels = [...availableModels, ...customModels];

  const handleModelToggle = (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModelIds(prev => [...prev, modelId]);
    } else {
      setSelectedModelIds(prev => prev.filter(id => id !== modelId));
    }
    setIsDirty(true);
  };

  const handleSelectAll = () => {
    setSelectedModelIds(standardModels.map(m => m.id));
    setIsDirty(true);
  };

  const handleDeselectAll = () => {
    setSelectedModelIds(prev => prev.filter(id => !standardModels.map(m => m.id).includes(id)));
    setIsDirty(true);
  };

  const handleProviderToggle = (provider: string, checked: boolean) => {
    const providerModelIds = groupedStandardModels[provider].map(m => m.id);
    if (checked) {
      setSelectedModelIds(prev => [...new Set([...prev, ...providerModelIds])]);
    } else {
      setSelectedModelIds(prev => prev.filter(id => !providerModelIds.includes(id)));
    }
    setIsDirty(true);
  };

  const handleSave = useCallback(() => {
    if (selectedModelIds.length === 0) {
      toast.error("Please select at least one model.");
      return;
    }
    setEnabledModels(selectedModelIds);
    toast.success("Model settings saved!");
    setIsDirty(false);
  }, [selectedModelIds, setEnabledModels, setIsDirty]);

  const handleCancel = useCallback(() => {
    setSelectedModelIds(enabledModelIds);
    setIsDirty(false);
  }, [enabledModelIds, setIsDirty]);

  // Listen for save/cancel events from parent dialog
  useEffect(() => {
    const handleSaveEvent = (event: CustomEvent) => {
      if (event.detail.tab === 'models') {
        handleSave();
      }
    };

    const handleCancelEvent = (event: CustomEvent) => {
      if (event.detail.tab === 'models') {
        handleCancel();
      }
    };

    window.addEventListener('settings-save', handleSaveEvent as EventListener);
    window.addEventListener('settings-cancel', handleCancelEvent as EventListener);

    return () => {
      window.removeEventListener('settings-save', handleSaveEvent as EventListener);
      window.removeEventListener('settings-cancel', handleCancelEvent as EventListener);
    };
  }, [handleSave, handleCancel]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">Models Configuration</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your available AI models. Select which models appear in the sidebar.
        </p>
      </div>

      {/* Standard Models Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Standard Models</h4>
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

        <Accordion type="multiple" defaultValue={Object.keys(groupedStandardModels)} className="w-full">
          {Object.entries(groupedStandardModels).map(([provider, models]) => {
            const providerModelIds = models.map(m => m.id);
            const selectedProviderModels = selectedModelIds.filter(id => providerModelIds.includes(id));
            const isProviderFullySelected = selectedProviderModels.length === providerModelIds.length;
            const isProviderPartiallySelected = selectedProviderModels.length > 0 && selectedProviderModels.length < providerModelIds.length;

            return (
              <AccordionItem key={provider} value={provider}>
                <div className="flex items-center justify-between py-3 px-1">
                  <div className="flex items-center space-x-2 flex-1">
                    <Checkbox
                      id={`provider-${provider}`}
                      checked={isProviderFullySelected}
                      ref={(el) => {
                        if (el) {
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
                      {provider}
                    </label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-muted-foreground">
                      {selectedProviderModels.length}/{providerModelIds.length}
                    </span>
                    <AccordionTrigger className="hover:no-underline p-0 h-auto [&[data-state=open]>svg]:rotate-180">
                      <span className="sr-only">Toggle {provider} models</span>
                    </AccordionTrigger>
                  </div>
                </div>
                
                <AccordionContent>
                  <div className="space-y-2 ml-6 pb-2">
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
                          <div className="flex items-center gap-1">
                            <span>{model.name}</span>
                            {model.hasReasoning && <Brain size={14} className="text-muted-foreground" />}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="text-xs text-muted-foreground">
          {selectedModelIds.filter(id => standardModels.map(m => m.id).includes(id)).length} of {standardModels.length} standard models selected
        </div>
      </div>

      <Separator />

      {/* Custom Models Section */}
      <CustomModelsForm setIsDirty={setIsDirty} />

      <div className="text-xs text-muted-foreground pt-2 border-t">
        Total: {selectedModelIds.length} of {allModels.length} models selected
      </div>
    </div>
  );
}

export default ModelsSettingsForm; 