# Omnichat - Your All-in-One LLM Chat Application

Omnichat is a versatile chat application that allows you to interact with various Large Language Models (LLMs) from different providers, all within a single, intuitive interface. It's built with Next.js, Tailwind CSS, and Shadcn UI for a modern and responsive experience.

## Features

- **Unified Chat Interface**: Seamlessly switch between different chat sessions.
- **Collapsible Side Menu**: 
    - Manage chat sessions (create, rename, delete).
    - Select from a wide range of LLM models (grouped by provider).
    - Configure API keys for each provider.
    - Set a global system prompt.
- **Rich Chat Screen**:
    - Display of chat messages with user and bot distinction.
    - Support for LLM "thinking steps" via an accordion (for models that provide this).
    - Markdown rendering for bot responses.
    - Timestamps for messages.
    - Animated indicators for message sending and bot thinking states.
- **File Uploads**: Attach text and image files to your messages.
    - Image previews in the input area.
    - File type and size restrictions.
- **Multi-Provider Support (Ongoing)**:
    - Currently integrates with **Google Gemini** and **Alibaba Qwen (Tongyi)**.
    - Architected to easily add more providers (e.g., OpenAI GPT, Anthropic Claude, Deepseek).
- **Persistent State**: Chat sessions, API keys, and preferences are saved in `localStorage` using Zustand.
- **Modern Tech Stack**: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, Lucide Icons.

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
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
    - Obtain API keys from the respective providers (Google AI Studio for Gemini, Alibaba Cloud for Qwen, etc.).
    - Once the application is running, you can enter these keys in the side menu under the model selection dropdown.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    # yarn dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/`: Main Next.js App Router directory.
  - `api/chat/route.ts`: Backend API route for handling LLM requests.
  - `components/`: UI components.
    - `layout/`: Components for the main page layout (e.g., `LeftSideMenu.tsx`, `ChatScreen.tsx`).
    - `chat/`: Components specific to the chat interface (e.g., `MessageList.tsx`, `ChatInput.tsx`, `WelcomeScreen.tsx`).
    - `ui/`: Shadcn UI components (auto-generated).
  - `store/chatStore.ts`: Zustand store for global state management.
  - `globals.css`: Global styles and Tailwind CSS setup.
  - `page.tsx`: Main page component.
  - `layout.tsx`: Root layout component.
- `public/`: Static assets.
- `components.json`: Shadcn UI configuration.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
