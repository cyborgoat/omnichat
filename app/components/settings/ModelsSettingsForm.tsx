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
import { useState, useEffect } from "react";
import { Brain } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  // Group models by provider (including custom models)
  const allModels = [...availableModels, ...customModels];
  const groupedModels = allModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof allModels>);

  const handleModelToggle = (modelId: string, checked: boolean) => {
    if (checked) {
      setSelectedModelIds(prev => [...prev, modelId]);
    } else {
      setSelectedModelIds(prev => prev.filter(id => id !== modelId));
    }
    setIsDirty(true);
  };

  const handleSelectAll = () => {
    setSelectedModelIds(allModels.map(m => m.id));
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
        <h3 className="text-md font-medium">Models Configuration</h3>
      </div>

      <p className="text-xs text-muted-foreground">
        Manage your available AI models. Standard models are pre-configured, while custom models allow you to add your own OpenAI-compatible endpoints.
      </p>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Models</TabsTrigger>
          <TabsTrigger value="custom">Custom Models</TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard" className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Active Standard Models</h4>
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

      <Accordion type="multiple" defaultValue={Object.keys(groupedModels)} className="w-full">
        {Object.entries(groupedModels).map(([provider, models]) => {
          const providerModelIds = models.map(m => m.id);
          const selectedProviderModels = selectedModelIds.filter(id => providerModelIds.includes(id));
          const isProviderFullySelected = selectedProviderModels.length === providerModelIds.length;
          const isProviderPartiallySelected = selectedProviderModels.length > 0 && selectedProviderModels.length < providerModelIds.length;

          return (
            <AccordionItem key={provider} value={provider}>
              <div className="flex items-center justify-between py-4 px-1">
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
                <div className="space-y-2 ml-6">
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
                          {model.hasReasoning && <Brain size={16} className="text-slate-600 dark:text-slate-400 !size-3.5" />}
                          {model.isCustom && <span className="text-xs text-blue-600 dark:text-blue-400">(Custom)</span>}
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

      <div className="pt-2 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {selectedModelIds.length} of {allModels.length} models selected
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || selectedModelIds.length === 0}
          className="text-xs"
          size="sm"
        >
          Save Model Settings
        </Button>
      </div>
          </TabsContent>
          
          <TabsContent value="custom">
            <CustomModelsForm setIsDirty={setIsDirty} />
          </TabsContent>
        </Tabs>
    </div>
  );
}

export default ModelsSettingsForm; 