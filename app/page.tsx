import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/layout/AppSidebar";
import ChatScreen from "./components/layout/ChatScreen";

export default function Home() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="relative flex flex-col flex-1 h-screen overflow-hidden">
        <ChatScreen />
      </SidebarInset>
    </SidebarProvider>
  );
}
