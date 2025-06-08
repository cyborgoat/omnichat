use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String, // "user", "assistant", "system", "model"
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProxySettings {
    pub enabled: bool,
    pub http: Option<String>,
    pub https: Option<String>,
    pub socks5: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    #[serde(rename = "modelId")]
    pub model_id: String,
    pub messages: Vec<ChatMessage>,
    #[serde(rename = "apiKey")]
    pub api_key: String,
    #[serde(rename = "systemPrompt")]
    pub system_prompt: Option<String>,
    #[serde(rename = "proxySettings")]
    pub proxy_settings: Option<ProxySettings>,
    #[serde(rename = "streamEnabled")]
    pub stream_enabled: Option<bool>,
    pub temperature: Option<f32>,
    #[serde(rename = "maxTokens")]
    pub max_tokens: Option<u32>,
    pub provider: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StreamChunk {
    pub content: Option<String>,
    pub thinking_content: Option<String>,
    pub error: Option<String>,
    pub done: bool,
}

#[derive(Debug)]
pub enum Provider {
    OpenAI,
    Google,
    Anthropic,
    Deepseek,
    Qwen,
    Volces,
    Custom,
}

impl std::str::FromStr for Provider {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "OpenAI" => Ok(Provider::OpenAI),
            "Google" => Ok(Provider::Google),
            "Anthropic" => Ok(Provider::Anthropic),
            "Deepseek" => Ok(Provider::Deepseek),
            "Qwen" => Ok(Provider::Qwen),
            "Volces" => Ok(Provider::Volces),
            "Custom" => Ok(Provider::Custom),
            _ => Err(anyhow::anyhow!("Unknown provider: {}", s)),
        }
    }
} 