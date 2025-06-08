use crate::chat::types::{ChatRequest, StreamChunk, ProxySettings};
use anyhow::Result;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use std::pin::Pin;

pub async fn handle_custom_request(request: ChatRequest) -> Result<Pin<Box<dyn futures_util::Stream<Item = Result<StreamChunk>> + Send>>> {
    let client = create_client(&request.proxy_settings)?;
    
    // For custom models, allow "None" API key (some endpoints don't require auth)
    let api_key = if request.api_key == "None" { "" } else { &request.api_key };
    
    // Extract API endpoint from model_id for custom models
    // Custom model IDs should be in format: "endpoint||model_name" 
    let (api_endpoint, model_name) = if request.model_id.contains("||") {
        let parts: Vec<&str> = request.model_id.split("||").collect();
        if parts.len() >= 2 {
            (parts[0].to_string(), parts[1].to_string())
        } else {
            return Err(anyhow::anyhow!("Invalid custom model format. Expected: endpoint||model_name"));
        }
    } else {
        return Err(anyhow::anyhow!("Custom model ID must contain endpoint information"));
    };
    
    // Use the endpoint exactly as provided by the user
    let full_endpoint = api_endpoint;
    
    // Filter and format messages for OpenAI-compatible API
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
    
    // For custom models, we could potentially fetch custom config defaults
    // but for now we'll use the request values or fallback to defaults
    let stream_enabled = request.stream_enabled.unwrap_or(true);
    let temperature = request.temperature.unwrap_or(0.7);
    let max_tokens = request.max_tokens.unwrap_or(4096);
    
    let request_body = json!({
        "model": model_name,
        "messages": api_messages,
        "stream": stream_enabled,
        "temperature": temperature,
        "max_tokens": max_tokens,
    });
    
    let mut request_builder = client
        .post(&full_endpoint)
        .header("Content-Type", "application/json");
    
    // Add authorization header only if API key is provided
    if !api_key.is_empty() {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", api_key));
    }
    
    let response = request_builder
        .json(&request_body)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow::anyhow!("Custom API request failed: {}", error_text));
    }
    
    // Handle streaming response
    let stream = response.bytes_stream().map(move |chunk_result| {
        match chunk_result {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                parse_custom_stream_chunk(&text)
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

fn parse_custom_stream_chunk(text: &str) -> Result<StreamChunk> {
    let mut content_parts = Vec::new();
    let mut thinking_parts = Vec::new();
    let mut done = false;
    let mut error = None;
    
    // Parse SSE format
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
                            // Handle regular content - collect ALL content, including empty strings
                            if let Some(content_text) = delta["content"].as_str() {
                                content_parts.push(content_text.to_string());
                            }
                            
                            // Handle reasoning/thinking content - preserve original spacing
                            if let Some(reasoning_text) = delta["reasoning_content"].as_str() {
                                thinking_parts.push(reasoning_text.to_string());
                            }
                        }
                        
                        // Check for finish reason
                        if let Some(finish_reason) = choice["finish_reason"].as_str() {
                            if finish_reason == "stop" || finish_reason == "length" {
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
    
    // Combine all content parts - return content if we have any parts (including empty ones during streaming)
    let content = if content_parts.is_empty() {
        None
    } else {
        Some(content_parts.join(""))
    };
    
    let thinking_content = if thinking_parts.is_empty() {
        None 
    } else {
        Some(thinking_parts.join(""))
    };
    
    Ok(StreamChunk {
        content,
        thinking_content,
        error,
        done,
    })
} 