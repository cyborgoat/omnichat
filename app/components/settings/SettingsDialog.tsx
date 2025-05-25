"use client";

import { Button } from "@/components/ui/button";
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
import { ProxySettingsForm } from "./ProxySettingsForm"; // Import proxy settings component
import { AdvancedSettingsForm } from "./AdvancedSettingsForm"; // Import advanced settings component
import { SettingsIcon } from "lucide-react"; // Import SettingsIcon

interface SettingsDialogProps {
  isMenuCollapsed: boolean;
}

export function SettingsDialog({ isMenuCollapsed }: SettingsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          className={`text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent w-full flex justify-start items-center ${isMenuCollapsed ? 'px-2' : 'px-2 py-2'}`}
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
        <Tabs defaultValue="models" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
            <TabsTrigger value="models" className="text-xs sm:text-sm">Models</TabsTrigger>
            <TabsTrigger value="apiKeys" className="text-xs sm:text-sm">API Keys</TabsTrigger>
            <TabsTrigger value="proxy" className="text-xs sm:text-sm">Proxy</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs sm:text-sm">Advanced</TabsTrigger>
          </TabsList>
          <TabsContent value="models" className="mt-4 px-1 sm:px-0">
            <ModelsSettingsForm />
          </TabsContent>
          <TabsContent value="apiKeys" className="mt-4 px-1 sm:px-0">
            <ApiKeysSettingsForm />
          </TabsContent>
          <TabsContent value="proxy" className="mt-4 px-1 sm:px-0">
            <ProxySettingsForm />
          </TabsContent>
          <TabsContent value="advanced" className="mt-4 px-1 sm:px-0">
            <AdvancedSettingsForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog; 