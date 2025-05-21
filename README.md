# Omnichat - Your All-in-One LLM Chat Application

Omnichat is a versatile chat application that allows you to interact with various Large Language Models (LLMs) from different providers, all within a single, intuitive interface. It's built with Next.js, Tailwind CSS, and Shadcn UI for a modern and responsive experience.

## Features

- **Unified Chat Interface**: Seamlessly switch between different chat sessions.
- **Collapsible Side Menu**:
    - Manage chat sessions (create, rename, delete).
    - Select from a wide range of LLM models (grouped by provider).
    - **Dynamic Model Selection per Session**: Change the LLM for the active chat session on the fly.
    - Configure API keys for each provider.
    - Set a global system prompt.
- **Rich Chat Screen**:
    - Display of chat messages with user and bot distinction, featuring an improved UI with timestamps below message bubbles and consistent font sizes.
    - Support for LLM "thinking steps" via an accordion (for models that provide this).
    - Markdown rendering for bot responses, including:
        - Syntax-highlighted code blocks with a copy-to-clipboard button.
        - Theme-aware code block styling for optimal visibility in light and dark modes.
    - Timestamps for messages.
    - Animated indicators for message sending and bot thinking states.
- **File Uploads**: Attach text and image files to your messages.
    - Image previews in the input area.
    - File type and size restrictions.
- **Multi-Provider Support**:
    - Currently integrates with **Google Gemini**, **Alibaba Qwen (Tongyi)**, and **Deepseek**.
    - Architected to easily add more providers (e.g., OpenAI GPT, Anthropic Claude).
- **Persistent State**: Chat sessions (including their selected model), API keys, and preferences are saved in `localStorage` using Zustand.
- **Modern Tech Stack**: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, Lucide Icons.
- **Theme Toggle**: Switch between light and dark themes.

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn

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
    # yarn install
    ```

3.  **API Keys:**
    Omnichat requires API keys for the LLM providers you wish to use. These are not included in the repository.
    - Obtain API keys from the respective providers (Google AI Studio for Gemini, Alibaba Cloud for Qwen, Deepseek platform, etc.).
    - Once the application is running, you can enter these keys in the side menu under the model selection dropdown for the respective provider.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) (or the port specified in your terminal if 3000 is busy) with your browser to see the result.

## Project Structure

- `app/`: Main Next.js App Router directory.
  - `api/chat/route.ts`: Backend API route for handling LLM requests across multiple providers.
  - `components/`: UI components.
    - `layout/`: Components for the main page layout (e.g., `LeftSideMenu.tsx`, `ChatScreen.tsx`).
    - `chat/`: Components specific to the chat interface (e.g., `MessageList.tsx`, `ChatInput.tsx`, `WelcomeScreen.tsx`).
    - `ui/`: Shadcn UI components (auto-generated and customized).
  - `store/chatStore.ts`: Zustand store for global state management (chat sessions, API keys, UI state).
  - `globals.css`: Global styles and Tailwind CSS setup, including theme variables.
  - `page.tsx`: Main page component.
  - `layout.tsx`: Root layout component.
- `public/`: Static assets.
- `components.json`: Shadcn UI configuration.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
