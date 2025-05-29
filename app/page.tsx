import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/layout/AppSidebar";
import ChatScreen from "./components/layout/ChatScreen";

export default function Home() {
  return (
    <SidebarProvider className="h-full">
      <AppSidebar />
      <SidebarInset className="relative flex flex-col flex-1 h-full overflow-hidden">
        <ChatScreen />
      </SidebarInset>
    </SidebarProvider>
  );
}
