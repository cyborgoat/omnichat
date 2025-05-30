# Omnichat - Your All-in-One LLM Chat Application

Omnichat is a versatile chat application that allows you to interact with various Large Language Models (LLMs) from different providers, all within a single, intuitive interface. Available as both a web application and a native desktop app, it's built with Next.js, Tailwind CSS, Shadcn UI, and Tauri for a modern, responsive, and cross-platform experience.

> **Latest Update (v1.1.4)**: Enhanced reasoning model support with brain icons, improved shimmer effects for LLM activity states, comfortable dark theme refinements, and streamlined model configuration management for a more intuitive user experience.

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
- **Animated Indicators**: Visual feedback for message sending and bot thinking states with dynamic shimmer effects
- **Reasoning Process Visualization**: Expandable thinking process display for reasoning-capable models
- **File Upload Support**: Attach text and image files with previews and validation

### 🧠 **Intelligent Model Management**
- **Reasoning Model Recognition**: Automatic identification and visual distinction of reasoning-capable models
  - Brain icons (`🧠`) for models with advanced reasoning capabilities
  - Smart detection of OpenAI o3, DeepSeek R1, Qwen reasoning models, and Claude advanced models
  - Enhanced UI feedback for reasoning process states
- **Dynamic Model Selection**: Switch LLM models per session on the fly
- **Provider Grouping**: Models organized by provider for easy selection
- **Centralized Configuration**: JSON-based model definitions for easier maintenance

### 🎛️ **Comprehensive Settings Management**
- **Settings Dialog**: Centralized settings management with tabbed interface
  - **Profile Settings**: Configure username and avatar URL with localStorage persistence
  - **API Key Management**: Secure management of all provider API keys with show/hide functionality
  - **Models Configuration**: Visual model selection with reasoning capability indicators
- **Form Validation**: Built with react-hook-form and Zod for robust input validation
- **Toast Notifications**: User-friendly feedback using Sonner for all actions

### 🔧 **Smart Side Menu**
- **Collapsible Design**: Space-efficient interface with smooth animations
- **Chat Session Management**: Create, rename, delete, and organize chat sessions
- **Model Selection with Visual Cues**: Brain icons distinguish reasoning models in sidebar
- **Global System Prompt**: 
  - Advanced prompt management with apply/undo functionality
  - Visual indicators for unsaved changes
  - Session-specific prompt application
- **Enhanced Theme Toggle**: Improved responsiveness and comfortable dark theme colors

### 🌐 **Advanced Network & Proxy Support**
- **Comprehensive Proxy Integration**: Full support for users in restricted regions
  - SOCKS5, HTTP, and HTTPS proxy protocols with intelligent priority selection
  - Curl-based implementation for reliable proxy compatibility
  - Seamless regional access to all supported AI providers
- **Smart Proxy Management**: Easy configuration through Advanced Settings
  - Visual proxy status indicators and testing functionality
  - Automatic fallback and error handling
  - Support for authenticated and unauthenticated proxies

### 🌐 **Multi-Provider Support**
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Google Gemini**: Gemini 1.5 Pro, Gemini 1.0 Pro
- **Anthropic Claude**: Claude 3 Opus, Sonnet, and Haiku
- **Deepseek**: DeepSeek Chat and Coder models
- **Alibaba Qwen**: Qwen Turbo, Plus, Max, and QwQ Deep Thinking models (via Dashscope)
- **Volces (Volcengine)**: DeepSeek-R1, DeepSeek-V3
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
    - **Volces (Volcengine)**: Get your API key from [Volcengine Console](https://console.volcengine.com/ark/)
    
    Enter these keys in the Settings dialog (accessible via the settings icon in the side menu).

### Running the Application

#### Web Application (Development)
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

#### Desktop Application (Development)
```bash
# Development mode (includes API routes via proxy)
npm run tauri:dev
# or
yarn tauri:dev
```

#### Production Builds

**Web Deployment (with API routes):**
```bash
npm run build:web
# or
yarn build:web
```

**Desktop Application (static export):**
```bash
npm run tauri:build
# or
yarn tauri:build
```

**Note:** The application features a unified client-side architecture with hybrid proxy support:
- **Consistent API Handling**: All LLM provider interactions use direct client-side API calls by default
- **Intelligent Proxy Routing**: Automatic server-side curl implementation when proxy is enabled for maximum compatibility
- **Cross-Platform Compatibility**: Same codebase works perfectly in both web and desktop environments
- **Simplified Deployment**: No server-side dependencies required for standard deployment modes
- **CORS-Optimized**: Uses provider-specific endpoints that support browser-based requests

This streamlined architecture ensures:
- ✅ **Web deployments** work as static sites without requiring a server (unless proxy is needed)
- ✅ **Desktop builds** work identically to web builds with full proxy support
- ✅ **Regional Access**: Reliable proxy support for users in restricted regions
- ✅ **Simplified maintenance** with unified API handling logic
- ✅ **Better performance** with direct provider communication or optimized proxy routing

## Project Structure

```
omnichat/
├── app/                          # Next.js App Router
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
│   ├── lib/
│   │   └── chat-client.ts       # Unified client-side API handlers
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
# Development
npm run dev          # Start Next.js dev server
npm run tauri:dev    # Start Tauri dev mode (desktop)

# Production builds
npm run build:web    # Build for web deployment (static export)
npm run build:tauri  # Build for Tauri (same as web build)
npm run tauri:build  # Build complete desktop application

# Other scripts
npm run build        # Default build (static export)
npm run start        # Start production server (web only)
npm run lint         # Run ESLint
npm run tauri        # Tauri CLI access
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
