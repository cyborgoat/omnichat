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
import { ProfileSettingsForm } from "./ProfileSettingsForm"; // Import new component
import { ApiKeysSettingsForm } from "./ApiKeysSettingsForm"; // Import new component
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your application settings. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="apiKeys">API Keys</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <ProfileSettingsForm />
          </TabsContent>
          <TabsContent value="apiKeys">
            <ApiKeysSettingsForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsDialog; 