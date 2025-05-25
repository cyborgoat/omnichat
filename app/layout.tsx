import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/app/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

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
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
    ],
  },
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
