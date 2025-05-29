import type {Metadata, Viewport} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/app/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import EnvironmentLogger from "@/app/components/EnvironmentLogger";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Omnichat - Your All-in-One LLM Chat Application",
  description: "A versatile chat application that allows you to interact with various Large Language Models (LLMs) from different providers, all within a single, intuitive interface. Available as both a web application and a native desktop app.",
  keywords: ["AI", "LLM", "Chat", "OpenAI", "Gemini", "Claude", "Deepseek", "Qwen", "Desktop App"],
  authors: [{ name: "Omnichat Team" }],
  creator: "Omnichat",
  publisher: "Omnichat",
  icons: {
    icon: [
      { url: "/omnichat.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/omnichat.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/omnichat.ico", sizes: "32x32", type: "image/x-icon" },
    ],
  },
  manifest: "/manifest.json",
};

export function generateViewport(): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ],
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} h-full`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <EnvironmentLogger />
          <div className="h-full">
            {children}
          </div>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
