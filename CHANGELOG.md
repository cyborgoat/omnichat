# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-05-25

### Added
- **Multi-Provider AI Chat Interface**: Support for OpenAI, Anthropic, and Google Gemini models
- **Desktop Application**: Cross-platform desktop app built with Tauri 2.0
- **Settings Management**: Comprehensive settings dialog with profile and API key management
- **Theme Support**: Light and dark theme with automatic logo color adaptation
- **Chat Session Management**: Create, rename, delete, and manage multiple chat sessions
- **Global System Prompts**: Set and apply system prompts across chat sessions
- **Responsive Design**: Modern UI built with Next.js 15, Tailwind CSS, and shadcn/ui
- **Real-time Streaming**: Support for streaming responses from AI providers
- **Code Syntax Highlighting**: Beautiful code blocks with copy functionality
- **Toast Notifications**: User feedback with Sonner toast notifications
- **State Management**: Persistent state management with Zustand
- **Form Validation**: Robust form handling with React Hook Form and Zod
- **Markdown Support**: Rich markdown rendering for AI responses
- **File Preview**: Theme-aware SVG and image preview component

### Technical Features
- Next.js 15 with App Router and static export
- Tauri 2.0 for cross-platform desktop deployment
- TypeScript for type safety
- Tailwind CSS 4 for styling
- Framer Motion for smooth animations
- React 19 with modern hooks
- PWA support with manifest and service worker ready

### Security
- Secure API key storage and management
- Client-side only API key handling
- No server-side data persistence

## [1.1.0] - 2025-05-25

### Added
- **QwQ Deep Thinking Models**: Support for Qwen's QwQ reasoning models with deep thinking capabilities
- **Qwen3 Models**: Latest Qwen3 Plus and Turbo models with enhanced reasoning abilities
- **DeepSeek-R1**: DeepSeek-R1 deep thinking model via Alibaba Cloud Dashscope
- **Enhanced API Handler**: Updated Qwen handler to support both traditional and deep thinking models
- **OpenAI-Compatible Endpoint**: Seamless integration with Dashscope's OpenAI-compatible API for QwQ models

### Technical Improvements
- Dual API endpoint support for Qwen models (traditional Dashscope and OpenAI-compatible)
- Automatic model detection for deep thinking capabilities
- Enhanced streaming support for reasoning models
- Improved error handling for different API endpoints

## [1.1.1] - 2025-01-27

### Fixed
- **Critical Tauri Build Issue**: Fixed welcome page appearing in chat bubbles in built Tauri applications
- **Environment Detection**: Enhanced environment detection with multiple fallback methods for reliable Tauri/static export identification
- **API Route Handling**: Improved dual-environment architecture to properly route API calls in both web and desktop modes
- **Build Process**: Enhanced build scripts to properly handle API folder during static export builds

### Technical Improvements
- **Robust Environment Detection**: Added multiple detection methods (`__TAURI__` global, protocol check, user agent, static export detection)
- **Automatic API Routing**: Smart routing between server-side API routes (web) and client-side API calls (desktop)
- **Fallback Mechanisms**: Automatic fallback to client-side handlers if server-side API fails
- **Enhanced Logging**: Detailed environment detection logging for better debugging
- **Cross-Platform Build Scripts**: Improved build scripts using Node.js for better cross-platform compatibility

### Architecture
- **Unified Chat Handler**: Single `handleChat()` function that automatically chooses the appropriate API method
- **Static Export Support**: Proper handling of Next.js static exports for Tauri builds
- **Dual Build Configuration**: Separate build targets for web deployment and desktop applications

## [Unreleased]
- Additional AI provider integrations
- Enhanced chat export functionality
- Plugin system for custom AI models
- Advanced prompt templates
- Separate thinking process visualization

### Changed
- Refactored chat client handlers into separate files per provider under `app/lib/chat-clients/`.
- Improved error handling for API responses to include message body.
- Added timeout for all client-side LLM API requests (15 seconds).
- Enhanced SSE stream processing for Volces client to prevent message clipping.

### Removed
- Removed Proxy Settings UI and all related logic (client-side proxying not effective for `fetch`).
  - Deleted `ProxySettingsForm.tsx`.
  - Removed proxy settings from Zustand store and `AdvancedSettingsForm.tsx`.
  - Deleted `PROXY_SETUP.md` and related constants.

### Fixed
- Corrected Gemini client handler to filter out empty messages, preventing an API error.
- Resolved an issue where `anthropic-client.ts` was not correctly populated during refactoring. 