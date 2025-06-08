use crate::chat::types::{ChatRequest, StreamChunk, ProxySettings};
use anyhow::Result;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use std::pin::Pin;

pub async fn handle_deepseek_request(request: ChatRequest) -> Result<Pin<Box<dyn futures_util::Stream<Item = Result<StreamChunk>> + Send>>> {
    let client = create_client(&request.proxy_settings)?;
    
    // DeepSeek reasoning models that use reasoning_content field (per DeepSeek API docs)
    let deepseek_reasoning_models = vec![
        "deepseek-reasoner",
        "deepseek-r1",
        "deepseek-r1-0528",
        "deepseek-r1-lite"
    ];
    
    let is_deepseek_reasoning_model = deepseek_reasoning_models.iter().any(|&model| {
        request.model_id.contains(model) || request.model_id == model
    });
    
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
    
    let mut request_body = json!({
        "model": request.model_id,
        "messages": api_messages,
        "stream": request.stream_enabled.unwrap_or(true),
    });
    
    // Add temperature and max_tokens only for non-reasoning models (per DeepSeek docs)
    if !is_deepseek_reasoning_model {
        request_body["temperature"] = json!(request.temperature.unwrap_or(0.7));
        request_body["max_tokens"] = json!(request.max_tokens.unwrap_or(4096));
    } else {
        // For reasoning models, only max_tokens is supported (default 32K, max 64K)
        request_body["max_tokens"] = json!(request.max_tokens.unwrap_or(32768));
    }
    
    // Skip API call if API key is "None" to avoid errors
    if request.api_key == "None" {
        return Err(anyhow::anyhow!("API key is required but set to 'None'. Please set a valid API key."));
    }

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
    
    // Simple streaming - accumulate text and process complete lines
    let mut accumulated_text = String::new();
    let stream = response.bytes_stream().map(move |chunk_result| {
        match chunk_result {
            Ok(bytes) => {
                let new_text = String::from_utf8_lossy(&bytes);
                accumulated_text.push_str(&new_text);
                
                // Process any complete lines (ending with \n)
                parse_accumulated_text(&mut accumulated_text, is_deepseek_reasoning_model)
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

fn parse_accumulated_text(text: &mut String, is_reasoning_model: bool) -> Result<StreamChunk> {
    let mut content_parts = Vec::new();
    let mut thinking_parts = Vec::new();
    let mut done = false;
    let mut error = None;
    
    // Find all complete lines (ending with \n) and process them
    let mut processed_chars = 0;
    let lines: Vec<&str> = text.lines().collect();
    
    for (i, line) in lines.iter().enumerate() {
        let line = line.trim();
        
        // Check if this line is complete (has a newline after it in the original text)
        let line_start = if i == 0 { 0 } else { 
            lines[..i].iter().map(|l| l.len() + 1).sum::<usize>()
        };
        let line_end = line_start + line.len();
        
        // Only process if there's a newline after this line (making it complete)
        if line_end < text.len() && text.chars().nth(line_end) == Some('\n') {
            processed_chars = line_end + 1; // +1 for the newline
            
            if line.starts_with("data: ") {
                let data_content = line[6..].trim();
                
                if data_content == "[DONE]" {
                    done = true;
                    break;
                }
                
                // Parse JSON
                if let Ok(parsed) = serde_json::from_str::<Value>(data_content) {
                    if let Some(choices) = parsed["choices"].as_array() {
                        if let Some(choice) = choices.get(0) {
                            if let Some(delta) = choice.get("delta") {
                                // Handle reasoning content for reasoning models
                                if is_reasoning_model {
                                    if let Some(reasoning_text) = delta["reasoning_content"].as_str() {
                                        thinking_parts.push(reasoning_text.to_string());
                                    }
                                }
                                
                                // Handle regular content - collect ALL content, including empty strings
                                if let Some(content_text) = delta["content"].as_str() {
                                    content_parts.push(content_text.to_string());
                                }
                            }
                            
                            // Check finish reason
                            if let Some(finish_reason) = choice["finish_reason"].as_str() {
                                if finish_reason == "stop" || finish_reason == "length" {
                                    done = true;
                                }
                            }
                        }
                    }
                    
                    // Handle errors
                    if let Some(error_obj) = parsed.get("error") {
                        if let Some(error_message) = error_obj["message"].as_str() {
                            error = Some(error_message.to_string());
                        }
                        done = true;
                        break;
                    }
                }
            }
        }
    }
    
    // Remove only the processed complete lines from buffer
    if processed_chars > 0 {
        text.drain(0..processed_chars);
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