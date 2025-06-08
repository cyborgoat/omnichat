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
    setIsDirty(false); // Reset dirty state
    setActiveTab(nextTab);
    setShowConfirmDialog(false);
    // Here you might want to add logic to actually save or discard changes
    // For now, we just allow navigation.
  };

  const handleCancelNavigation = () => {
    setShowConfirmDialog(false);
  };

  const handleSave = () => {
    // Trigger save for the current active tab
    const event = new CustomEvent('settings-save', { detail: { tab: activeTab } });
    window.dispatchEvent(event);
    setIsDirty(false);
  };

  const handleCancel = () => {
    // Trigger cancel for the current active tab
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
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application settings. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 gap-1">
            <TabsTrigger value="models" className="text-xs sm:text-sm">Models</TabsTrigger>
            <TabsTrigger value="apiKeys" className="text-xs sm:text-sm">API Keys</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs sm:text-sm">Advanced</TabsTrigger>
          </TabsList>
          <TabsContent value="models" className="mt-4 px-1 sm:px-0">
            <ModelsSettingsForm setIsDirty={setIsDirty} />
          </TabsContent>
          <TabsContent value="apiKeys" className="mt-4 px-1 sm:px-0">
            <ApiKeysSettingsForm setIsDirty={setIsDirty} />
          </TabsContent>
          <TabsContent value="advanced" className="mt-4 px-1 sm:px-0">
            <AdvancedSettingsForm setIsDirty={setIsDirty} />
          </TabsContent>
        </Tabs>
        {shouldShowSaveCancel && (
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={!isDirty}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={!isDirty}
              className="text-xs"
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
                You have unsaved changes. Are you sure you want to leave this tab? Your changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelNavigation}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmNavigation}>Confirm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog; 