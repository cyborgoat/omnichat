use crate::chat::types::{ChatRequest, StreamChunk, ProxySettings};
use anyhow::Result;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use std::pin::Pin;
use regex::Regex;

pub async fn handle_deepseek_request(request: ChatRequest) -> Result<Pin<Box<dyn futures_util::Stream<Item = Result<StreamChunk>> + Send>>> {
    let client = create_client(&request.proxy_settings)?;
    
    // Filter and format messages for DeepSeek API
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
        if (msg.role == "user" || msg.role == "assistant") && !msg.content.trim().is_empty() {
            api_messages.push(json!({
                "role": msg.role,
                "content": msg.content.trim()
            }));
        }
    }
    
    if api_messages.is_empty() {
        return Err(anyhow::anyhow!("At least one non-empty message is required"));
    }
    
    let request_body = json!({
        "model": request.model_id,
        "messages": api_messages,
        "stream": request.stream_enabled.unwrap_or(true),
        "temperature": request.temperature.unwrap_or(0.7),
        "max_tokens": request.max_tokens.unwrap_or(4096),
    });
    
    let response = client
        .post("https://api.deepseek.com/v1/chat/completions")
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
    let thinking_pattern = Regex::new(r"<Thought>([\s\S]*?)</Thought>").unwrap();
    
    let stream = response.bytes_stream().map(move |chunk_result| {
        match chunk_result {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                parse_deepseek_stream_chunk(&text, &thinking_pattern)
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

fn parse_deepseek_stream_chunk(text: &str, thinking_pattern: &Regex) -> Result<StreamChunk> {
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
                            if let Some(text) = delta["content"].as_str() {
                                // Process thinking blocks for DeepSeek
                                let mut processed_content = text.to_string();
                                let mut thinking_parts = Vec::new();
                                
                                // Extract thinking blocks
                                for cap in thinking_pattern.captures_iter(text) {
                                    if let Some(thinking_text) = cap.get(1) {
                                        thinking_parts.push(thinking_text.as_str().trim());
                                        processed_content = processed_content.replace(&cap[0], "");
                                    }
                                }
                                
                                // Set thinking content if we found any
                                if !thinking_parts.is_empty() {
                                    thinking_content = Some(thinking_parts.join("\n"));
                                }
                                
                                // Set regular content if there's anything left after removing thinking blocks
                                if !processed_content.trim().is_empty() {
                                    content = Some(processed_content.trim().to_string());
                                }
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