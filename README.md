# Omnichat - All-in-One LLM Chat Application

A modern chat application for interacting with multiple AI models from different providers. Available as both a web app and desktop application.

## ✨ Key Features

- **🌐 Multi-Provider Support**: OpenAI, Claude, Gemini, DeepSeek, Qwen, and custom models
- **🧠 Reasoning Models**: Special support for thinking/reasoning models with visual indicators
- **💻 Cross-Platform**: Web app + native desktop app (Windows, macOS, Linux)
- **🔧 Custom Models**: Add your own vLLM, Ollama, or OpenAI-compatible endpoints
- **🌍 Proxy Support**: Full SOCKS5/HTTP proxy support for restricted regions
- **💬 Advanced Chat**: Real-time streaming, markdown rendering, file uploads
- **🎨 Modern UI**: Dark/light themes, responsive design, smooth animations

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/cyborgoat/omnichat
cd omnichat
npm install
```

### 2. Run the App
```bash
# Web application
npm run dev
# Open http://localhost:3000

# Desktop application
npm run tauri:dev
```

### 3. Add API Keys
- Click the Settings icon in the sidebar
- Go to "API Keys" tab
- Add keys for the providers you want to use:
  - **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys)
  - **Claude**: [console.anthropic.com](https://console.anthropic.com/)
  - **Gemini**: [makersuite.google.com](https://makersuite.google.com/app/apikey)
  - **DeepSeek**: [platform.deepseek.com](https://platform.deepseek.com/)
  - **Qwen**: [dashscope.aliyun.com](https://dashscope.aliyun.com/)

### 4. Start Chatting!
- Select a model from the dropdown
- Type your message and press Enter
- Switch models anytime during conversation

## 🔧 Custom Models Setup

Add your own AI models (vLLM, Ollama, etc.):

### vLLM Example
```bash
# Start vLLM server
python -m vllm.entrypoints.openai_api_server \
    --model Qwen/Qwen2.5-7B-Instruct \
    --port 8000
```

### Ollama Example  
```bash
# Start Ollama
ollama serve
# Pull a model
ollama pull llama3.2
```

### Add to Omnichat
1. Go to Settings → Models → Custom Models
2. Click "Add Model"
3. Configure:
   - **Name**: "My Local Model"
   - **Endpoint**: `http://localhost:8000` (vLLM) or `http://localhost:11434` (Ollama)
   - **Model**: `Qwen/Qwen2.5-7B-Instruct` or `llama3.2`
   - **Reasoning**: Enable if model supports thinking
4. Test connection and save

## 🌍 Proxy Setup (For Restricted Regions)

1. Go to Settings → Advanced → Proxy Settings
2. Configure your proxy:
   - **SOCKS5**: `socks5://127.0.0.1:1080`
   - **HTTP**: `http://proxy.example.com:8080`
3. Test connection and enable

## 📱 Supported Models

### Reasoning Models (🧠)
- OpenAI o1, o1-mini, o1-preview
- DeepSeek R1, DeepSeek V3
- Qwen QwQ-32B-Preview
- Claude 3.5 Sonnet

### Standard Models
- GPT-4, GPT-4 Turbo, GPT-3.5
- Claude 3 Opus, Sonnet, Haiku
- Gemini 1.5 Pro, Gemini 1.0 Pro
- DeepSeek Chat, Coder
- Qwen Turbo, Plus, Max
- Custom vLLM/Ollama models

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Rust (for desktop builds)

### Commands
```bash
# Development
npm run dev              # Web app
npm run tauri:dev        # Desktop app

# Production builds
npm run build:web        # Web deployment
npm run tauri:build      # Desktop executable

# Linting
npm run lint             # Check code quality
```

## 🏗️ Architecture

- **Frontend**: Next.js 15, React 18, TypeScript
- **UI**: Tailwind CSS, Shadcn/ui, Framer Motion
- **State**: Zustand with localStorage persistence
- **Desktop**: Tauri 2.0 (Rust backend)
- **Validation**: Zod schemas, react-hook-form

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` to check code quality
5. Submit a pull request

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/cyborgoat/omnichat/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/cyborgoat/omnichat/discussions)

---

**Made with ❤️ for the AI community**
