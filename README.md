# Omnichat - Your All-in-One LLM Chat Application

Omnichat is a versatile chat application that allows you to interact with various Large Language Models (LLMs) from different providers, all within a single, intuitive interface. Available as both a web application and a native desktop app, it's built with Next.js, Tailwind CSS, Shadcn UI, and Tauri for a modern, responsive, and cross-platform experience.

## Features

### 🚀 **Desktop & Web Application**
- **Native Desktop App**: Built with Tauri 2.0 for Windows, macOS, and Linux
- **Web Application**: Accessible via any modern web browser
- **Cross-Platform**: Consistent experience across all platforms

### 💬 **Advanced Chat Interface**
- **Unified Chat Interface**: Seamlessly switch between different chat sessions
- **Rich Message Display**: 
  - User and bot message distinction with improved UI
  - Timestamps below message bubbles
  - Consistent, readable font sizes
  - Markdown rendering for bot responses with syntax-highlighted code blocks
  - Copy-to-clipboard functionality for code blocks
  - Theme-aware styling for optimal visibility in light and dark modes
- **Real-time Streaming**: Live message streaming from LLM providers
- **Animated Indicators**: Visual feedback for message sending and bot thinking states
- **File Upload Support**: Attach text and image files with previews and validation

### 🎛️ **Comprehensive Settings Management**
- **Settings Dialog**: Centralized settings management with tabbed interface
  - **Profile Settings**: Configure username and avatar URL with localStorage persistence
  - **API Key Management**: Secure management of all provider API keys with show/hide functionality
- **Form Validation**: Built with react-hook-form and Zod for robust input validation
- **Toast Notifications**: User-friendly feedback using Sonner for all actions

### 🔧 **Smart Side Menu**
- **Collapsible Design**: Space-efficient interface with smooth animations
- **Chat Session Management**: Create, rename, delete, and organize chat sessions
- **Dynamic Model Selection**: Switch LLM models per session on the fly
- **Global System Prompt**: 
  - Advanced prompt management with apply/undo functionality
  - Visual indicators for unsaved changes
  - Session-specific prompt application
- **Provider Grouping**: Models organized by provider for easy selection

### 🌐 **Multi-Provider Support**
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Google Gemini**: Gemini 1.5 Pro, Gemini 1.0 Pro
- **Anthropic Claude**: Claude 3 Opus, Sonnet, and Haiku
- **Deepseek**: DeepSeek Chat and Coder models
- **Alibaba Qwen**: Qwen Turbo, Plus, Max, and QwQ Deep Thinking models (via Dashscope)
- **Extensible Architecture**: Easy to add new providers

### 🎨 **Modern UI/UX**
- **Responsive Design**: Optimized for all screen sizes
- **Dark/Light Theme**: System-aware theme switching
- **Smooth Animations**: Framer Motion for polished interactions
- **Compact Forms**: Optimized spacing and typography for better usability
- **Accessibility**: ARIA labels and keyboard navigation support

### 💾 **Persistent State Management**
- **Zustand Store**: Efficient global state management
- **localStorage Persistence**: Chat sessions, API keys, and preferences saved locally
- **Session Restoration**: Automatic restoration of previous state on app restart

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm, yarn, or pnpm
- Rust (for desktop app builds)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/cyborgoat/omnichat
    cd omnichat
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **API Keys Setup:**
    Omnichat requires API keys for the LLM providers you wish to use:
    - **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
    - **Google Gemini**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
    - **Anthropic Claude**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
    - **Deepseek**: Get your API key from [Deepseek Platform](https://platform.deepseek.com/)
    - **Alibaba Qwen**: Get your API key from [Alibaba Cloud Dashscope](https://dashscope.aliyun.com/)
    
    Enter these keys in the Settings dialog (accessible via the settings icon in the side menu).

### Running the Application

#### Web Application
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

#### Desktop Application
```bash
# Development mode
npm run tauri:dev
# or
yarn tauri:dev

# Build for production
npm run tauri:build
# or
yarn tauri:build
```

## Project Structure

```
omnichat/
├── app/                          # Next.js App Router
│   ├── api/
│   │   └── chat/route.ts        # Multi-provider LLM API endpoint
│   ├── components/
│   │   ├── chat/                # Chat-specific components
│   │   │   ├── ChatInput.tsx
│   │   │   ├── MessageList.tsx
│   │   │   └── WelcomeScreen.tsx
│   │   ├── layout/              # Layout components
│   │   │   ├── ChatScreen.tsx
│   │   │   └── LeftSideMenu.tsx
│   │   ├── settings/            # Settings management
│   │   │   ├── SettingsDialog.tsx
│   │   │   ├── ProfileSettingsForm.tsx
│   │   │   └── ApiKeysSettingsForm.tsx
│   │   ├── ui/                  # Shadcn UI components
│   │   └── ThemeProvider.tsx
│   ├── store/
│   │   └── chatStore.ts         # Zustand global state
│   ├── globals.css              # Global styles & theme variables
│   ├── layout.tsx               # Root layout with Toaster
│   └── page.tsx                 # Main page component
├── src-tauri/                   # Tauri desktop app configuration
│   ├── tauri.conf.json         # Tauri settings
│   └── src/                    # Rust backend (minimal)
├── components/                  # Shadcn UI components
├── public/                      # Static assets
└── next.config.ts              # Next.js config for static export
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Shadcn UI
- **State Management**: Zustand with localStorage persistence
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Desktop**: Tauri 2.0
- **LLM Integration**: OpenAI, Google Gemini, Anthropic, Deepseek, Alibaba Qwen APIs

## Available Scripts

```bash
# Web development
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Desktop development
npm run tauri        # Tauri CLI
npm run tauri:dev    # Start Tauri dev mode
npm run tauri:build  # Build desktop app
```

## Configuration

### Environment Variables
No environment variables are required. All API keys are managed through the Settings dialog and stored securely in localStorage.

### Tauri Configuration
Desktop app settings can be modified in `src-tauri/tauri.conf.json`:
- Window dimensions and behavior
- App metadata and icons
- Security policies

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Guidelines
- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Maintain component modularity
- Add proper error handling
- Include appropriate TypeScript types

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Shadcn UI](https://ui.shadcn.com/) for the beautiful component library
- [Tauri](https://tauri.app/) for the desktop app framework
- [Zustand](https://github.com/pmndrs/zustand) for state management
- All the LLM providers for their APIs
