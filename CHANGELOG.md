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

## [Unreleased]
- Additional AI provider integrations
- Enhanced chat export functionality
- Plugin system for custom AI models
- Advanced prompt templates 