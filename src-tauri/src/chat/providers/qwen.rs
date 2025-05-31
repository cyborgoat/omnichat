use crate::chat::types::{ChatRequest, StreamChunk, ProxySettings};
use anyhow::Result;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use std::pin::Pin;

pub async fn handle_qwen_request(request: ChatRequest) -> Result<Pin<Box<dyn futures_util::Stream<Item = Result<StreamChunk>> + Send>>> {
    let client = create_client(&request.proxy_settings)?;
    
    // Qwen3 models that explicitly support enable_thinking
    let qwen3_thinking_models = vec![
        "qwen-plus-latest",
        "qwen-plus-2025-04-28", 
        "qwen-turbo-latest"
    ];
    let is_qwen3_thinking_model = qwen3_thinking_models.contains(&request.model_id.as_str());
    
    // Filter and format messages for Qwen API
    let mut api_messages = Vec::new();
    
    // Add system prompt if provided
    if let Some(system_prompt) = &request.system_prompt {
        if !system_prompt.trim().is_empty() {
            api_messages.push(json!({
                "role": "system",
                "content": system_prompt.trim()
            }));
        }
    }
    
    // Add filtered messages
    for msg in &request.messages {
        if (msg.role == "user" || msg.role == "assistant" || msg.role == "system") && !msg.content.trim().is_empty() {
            api_messages.push(json!({
                "role": msg.role,
                "content": msg.content.trim()
            }));
        }
    }
    
    if api_messages.is_empty() {
        return Err(anyhow::anyhow!("At least one non-empty message is required"));
    }
    
    let mut request_body = json!({
        "model": request.model_id,
        "messages": api_messages,
        "stream": request.stream_enabled.unwrap_or(true),
        "temperature": request.temperature.unwrap_or(0.7),
        "max_tokens": request.max_tokens.unwrap_or(4096),
    });
    
    // Enable thinking mode for Qwen3 models when streaming
    if is_qwen3_thinking_model && request.stream_enabled.unwrap_or(true) {
        request_body["enable_thinking"] = json!(true);
    }
    
    let response = client
        .post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", request.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("API request failed: {}", error_text));
    }
    
    // Handle streaming response
    let stream = response.bytes_stream().map(move |chunk_result| {
        match chunk_result {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                parse_qwen_stream_chunk(&text)
            }
            Err(e) => Ok(StreamChunk {
                content: None,
                thinking_content: None,
                error: Some(format!("Stream error: {}", e)),
                done: true,
            }),
        }
    });
    
    Ok(Box::pin(stream))
}

fn create_client(proxy_settings: &Option<ProxySettings>) -> Result<Client> {
    let mut client_builder = Client::builder()
        .timeout(Duration::from_secs(60))
        .use_rustls_tls();
    
    if let Some(proxy) = proxy_settings {
        if proxy.enabled {
            if let Some(proxy_url) = proxy.https.as_ref().or(proxy.http.as_ref()) {
                let proxy = reqwest::Proxy::all(proxy_url)?;
                client_builder = client_builder.proxy(proxy);
            }
        }
    }
    
    Ok(client_builder.build()?)
}

fn parse_qwen_stream_chunk(text: &str) -> Result<StreamChunk> {
    let mut content = None;
    let mut thinking_content = None;
    let mut done = false;
    let mut error = None;
    
    // Parse SSE format - look for data lines in the text
    for line in text.lines() {
        if line.starts_with("data: ") {
            let data_content = line[6..].trim();
            
            if data_content == "[DONE]" {
                done = true;
                break;
            }
            
            if let Ok(parsed) = serde_json::from_str::<Value>(data_content) {
                // Handle OpenAI-compatible format
                if let Some(choices) = parsed["choices"].as_array() {
                    if let Some(choice) = choices.get(0) {
                        if let Some(delta) = choice.get("delta") {
                            // Handle reasoning content for Qwen3 thinking models
                            if let Some(reasoning_content) = delta["reasoning_content"].as_str() {
                                thinking_content = Some(reasoning_content.to_string());
                            }
                            
                            // Handle regular content
                            if let Some(text) = delta["content"].as_str() {
                                content = Some(text.to_string());
                            }
                        }
                        
                        // Check for finish reason
                        if let Some(finish_reason) = choice["finish_reason"].as_str() {
                            if finish_reason == "stop" {
                                done = true;
                            }
                        }
                    }
                }
                
                // Handle errors
                if let Some(error_obj) = parsed.get("error") {
                    error = Some(error_obj["message"].as_str().unwrap_or("API Error").to_string());
                    done = true;
                }
            }
        }
    }
    
    Ok(StreamChunk {
        content,
        thinking_content,
        error,
        done,
    })
} 