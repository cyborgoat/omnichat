"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelsSettingsForm } from "./ModelsSettingsForm"; // Import models settings component
import { ApiKeysSettingsForm } from "./ApiKeysSettingsForm"; // Import new component
import { AdvancedSettingsForm } from "./AdvancedSettingsForm"; // Import advanced settings component
import { SettingsIcon } from "lucide-react"; // Import SettingsIcon
import { useState } from "react"; // Import useState

interface SettingsDialogProps {
  isMenuCollapsed: boolean;
  triggerButtonClassName?: string;
}

export function SettingsDialog({ isMenuCollapsed, triggerButtonClassName }: SettingsDialogProps) {
  const defaultClassName = `text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full flex justify-start items-center ${isMenuCollapsed ? 'px-2' : 'px-2 py-2'}`;
  const [activeTab, setActiveTab] = useState("models");
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [nextTab, setNextTab] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleTabChange = (value: string) => {
    if (isDirty) {
      setNextTab(value);
      setShowConfirmDialog(true);
    } else {
      setActiveTab(value);
    }
  };

  const handleConfirmNavigation = () => {
    setIsDirty(false);
    setActiveTab(nextTab);
    setShowConfirmDialog(false);
  };

  const handleCancelNavigation = () => {
    setShowConfirmDialog(false);
  };

  const handleSave = () => {
    const event = new CustomEvent('settings-save', { detail: { tab: activeTab } });
    window.dispatchEvent(event);
    setIsDirty(false);
  };

  const handleCancel = () => {
    const event = new CustomEvent('settings-cancel', { detail: { tab: activeTab } });
    window.dispatchEvent(event);
    setIsDirty(false);
  };

  const shouldShowSaveCancel = activeTab === "models" || activeTab === "apiKeys";
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          className={triggerButtonClassName || defaultClassName}
        >
          <SettingsIcon size={20} className={`${!isMenuCollapsed ? 'mr-2' : ''}`} />
          {!isMenuCollapsed && <span className="ml-1">Settings</span>}
          <span className="sr-only">Open Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto sm:w-[600px]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg">Settings</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure your AI models, API keys, and advanced options.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="models" className="text-xs">Models</TabsTrigger>
              <TabsTrigger value="apiKeys" className="text-xs">API Keys</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
            </TabsList>
            
            <div className="mt-4">
              <TabsContent value="models" className="mt-0">
                <ModelsSettingsForm setIsDirty={setIsDirty} />
              </TabsContent>
              <TabsContent value="apiKeys" className="mt-0">
                <ApiKeysSettingsForm setIsDirty={setIsDirty} />
              </TabsContent>
              <TabsContent value="advanced" className="mt-0">
                <AdvancedSettingsForm setIsDirty={setIsDirty} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        
        {shouldShowSaveCancel && (
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={!isDirty}
              size="sm"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={!isDirty}
              size="sm"
            >
              Save Changes
            </Button>
          </div>
        )}
        
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Are you sure you want to switch tabs? Your changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelNavigation}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmNavigation}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog; 