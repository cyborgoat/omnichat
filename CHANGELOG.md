# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.4] - 2025-01-28

### Added

- **Reasoning Model Support**: Enhanced AI model identification and user experience
  - Brain icons (`🧠`) for reasoning-capable models (OpenAI o3, DeepSeek R1, Qwen Plus/Turbo/QwQ, Claude Sonnet 3.7/4/Opus 4)
  - Visual distinction between standard and reasoning models in both sidebar and settings
  - Smart reasoning detection with `hasReasoning` property across all model interfaces
- **Enhanced Text Effects**: Dynamic shimmer animations for improved user feedback
  - Shimmer effects for "Working on it..." and "Show Reasoning Process" states
  - Intelligent timing that stops shimmer when reasoning completes (has thinking steps but response content ready)
  - Smooth motion primitives integration with configurable duration
- **Improved Theme System**: More comfortable and accessible dark theme
  - Refined dark theme colors using mild slate/stone palette instead of harsh black/white
  - Better contrast ratios for extended usage sessions
  - Consistent color temperature (260° hue) for reduced eye strain
- **Model Configuration Management**: Streamlined model definitions and maintenance
  - Centralized `config/models.json` file for easier model management
  - Migration logic to ensure existing users receive updated model properties
  - Automatic synchronization of model capabilities with stored preferences

### Enhanced

- **User Interface Improvements**: Multiple UI/UX refinements
  - Fixed theme toggle requiring two clicks by improving state management
  - Removed redundant "Sync Models" button from Models Settings (kept in Advanced Settings)
  - Enhanced brain icon sizing with proper CSS override handling (`!size-3`)
  - Improved model selection layout with proper flexbox containers for mixed text/icon content
- **Component Architecture**: Better separation of concerns and data flow
  - Structured model definitions with consistent reasoning capability flags
  - Enhanced message streaming state management for reasoning models
  - Improved accordion trigger styling for reasoning process display

### Fixed

- **Console Error Resolution**: Eliminated React hydration warnings
  - Resolved nested button elements issue in ModelsSettingsForm accordion structure
  - Separated checkbox controls from accordion triggers to prevent invalid HTML nesting
  - Improved component accessibility and browser compatibility
- **Model Data Consistency**: Ensured reliable model information across sessions
  - Fixed brain icons not displaying due to localStorage model data lacking `hasReasoning` property
  - Implemented automatic model definition merging during store hydration
  - Resolved JSX rendering issues with mixed text and icon elements

### Technical Improvements

- **Store Migration System**: Robust data migration for existing users
  - Automatic merging of latest model definitions with user preferences
  - Preserved user model selections while updating capabilities
  - Future-proof migration system for seamless updates
- **Motion Primitives Integration**: Enhanced animation system
  - Added `@motion-primitives/text-shimmer` for professional shimmer effects
  - Optimized animation performance with proper duration and timing controls
  - Consistent animation language across the application

## [1.1.3] - 2025-05-30

### Fixed

- **Critical Application Stability**: Resolved application crashes and screen disappearing issues
  - Fixed TypeScript compilation errors in all API routes (`Promise<unknown>` → `Promise<NextResponse>`)
  - Corrected layout height collapse causing 0-pixel viewport dimensions
  - Enhanced HTML/body height inheritance chain for proper full-screen layout
- **Accessibility Improvements**: Comprehensive accessibility compliance fixes
  - Eliminated duplicate HTML IDs between LeftSideMenu and AppSidebar components
  - Added proper label associations for all form elements and checkboxes
  - Enhanced screen reader compatibility and browser autofill functionality
- **UI Layout Stability**: Ensured consistent cross-platform layout behavior
  - Added explicit height classes to html, body, and root container elements
  - Fixed SidebarProvider height inheritance for proper responsive behavior
  - Improved form accessibility with explicit htmlFor attributes

### Technical Improvements

- **Robust Error Handling**: Enhanced TypeScript return type safety across all API endpoints
- **Cross-Platform Compatibility**: Unified height management for both web and desktop builds
- **Standards Compliance**: Full HTML accessibility standards adherence with unique element IDs
- **Developer Experience**: Eliminated compilation warnings and build failures

### Changed

- Enhanced all API route files with proper TypeScript return types
- Improved global CSS with explicit height inheritance rules
- Strengthened component accessibility with unique identifier patterns

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
