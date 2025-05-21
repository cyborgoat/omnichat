import LeftSideMenu from "./components/layout/LeftSideMenu";
import ChatScreen from "./components/layout/ChatScreen";

export default function Home() {
  return (
    <main className="flex h-screen">
      <LeftSideMenu />
      <ChatScreen />
    </main>
  );
}
