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
    
    // Handle streaming response
    let stream = response.bytes_stream().map(move |chunk_result| {
        match chunk_result {
            Ok(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                parse_deepseek_stream_chunk(&text, is_deepseek_reasoning_model)
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

fn parse_deepseek_stream_chunk(text: &str, is_reasoning_model: bool) -> Result<StreamChunk> {
    let mut content = None;
    let mut thinking_content = None;
    let mut done = false;
    let mut error = None;
    
    // Parse SSE format properly - split by lines and process each SSE event
    let lines: Vec<&str> = text.lines().collect();
    let mut i = 0;
    
    while i < lines.len() {
        let line = lines[i].trim();
        
        // Skip empty lines
        if line.is_empty() {
            i += 1;
            continue;
        }
        
        // Parse SSE data lines
        if line.starts_with("data: ") {
            let data_content = line[6..].trim();
            
            if data_content == "[DONE]" {
                done = true;
                break;
            }
            
            if let Ok(parsed) = serde_json::from_str::<Value>(data_content) {
                // Handle OpenAI-compatible format as per DeepSeek API docs
                if let Some(choices) = parsed["choices"].as_array() {
                    if let Some(choice) = choices.get(0) {
                        // Handle streaming delta content
                        if let Some(delta) = choice.get("delta") {
                            // Handle reasoning content for DeepSeek reasoning models (per API docs)
                            if is_reasoning_model {
                                if let Some(reasoning_content_val) = delta.get("reasoning_content") {
                                    if let Some(reasoning_text) = reasoning_content_val.as_str() {
                                        if !reasoning_text.trim().is_empty() {
                                            thinking_content = Some(reasoning_text.to_string());
                                        }
                                    }
                                }
                            }
                            
                            // Handle regular content
                            if let Some(content_val) = delta.get("content") {
                                if let Some(content_text) = content_val.as_str() {
                                    // For non-reasoning models, process <Thought> blocks if present
                                    if !is_reasoning_model && (content_text.contains("<Thought>") || content_text.contains("</Thought>")) {
                                        // Extract thinking content using simple string manipulation
                                        let mut processed_content = content_text.to_string();
                                        let mut thinking_parts = Vec::new();
                                        
                                        // Find <Thought>...</Thought> blocks
                                        let mut start_pos = 0;
                                        while let Some(start) = processed_content[start_pos..].find("<Thought>") {
                                            let actual_start = start_pos + start;
                                            if let Some(end) = processed_content[actual_start..].find("</Thought>") {
                                                let actual_end = actual_start + end + "</Thought>".len();
                                                let thinking_block = &processed_content[actual_start + "<Thought>".len()..actual_start + end];
                                                thinking_parts.push(thinking_block.trim().to_string());
                                                processed_content.replace_range(actual_start..actual_end, "");
                                                start_pos = actual_start;
                                            } else {
                                                break;
                                            }
                                        }
                                        
                                        // Set thinking content if we found any
                                        if !thinking_parts.is_empty() {
                                            thinking_content = Some(thinking_parts.join("\n"));
                                        }
                                        
                                        // Set regular content if there's anything left after removing thinking blocks
                                        let trimmed_content = processed_content.trim();
                                        if !trimmed_content.is_empty() {
                                            content = Some(trimmed_content.to_string());
                                        }
                                    } else if !content_text.trim().is_empty() {
                                        // Regular content without thinking blocks
                                        content = Some(content_text.to_string());
                                    }
                                }
                            }
                        }
                        
                        // Check for finish reason
                        if let Some(finish_reason) = choice.get("finish_reason") {
                            if let Some(finish_reason_str) = finish_reason.as_str() {
                                if finish_reason_str == "stop" || finish_reason_str == "length" {
                                    done = true;
                                }
                            }
                        }
                    }
                }
                
                // Handle errors
                if let Some(error_obj) = parsed.get("error") {
                    if let Some(error_message) = error_obj.get("message") {
                        error = Some(error_message.as_str().unwrap_or("API Error").to_string());
                    } else {
                        error = Some("Unknown API Error".to_string());
                    }
                    done = true;
                }
            } else {
                // If we can't parse as JSON, it might be malformed data
                eprintln!("Failed to parse DeepSeek SSE data as JSON: {}", data_content);
            }
        }
        
        i += 1;
    }
    
    Ok(StreamChunk {
        content,
        thinking_content,
        error,
        done,
    })
} 