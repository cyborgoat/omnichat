use crate::chat::types::{ChatRequest, StreamChunk, ProxySettings};
use anyhow::Result;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use std::pin::Pin;

pub async fn handle_volces_request(request: ChatRequest) -> Result<Pin<Box<dyn futures_util::Stream<Item = Result<StreamChunk>> + Send>>> {
    let client = create_client(&request.proxy_settings)?;
    
    // Volcengine thinking models that support reasoning_content (per Volcengine docs)
    let volces_thinking_models = vec![
        "deepseek-r1",
        "deepseek-r1-0528", 
        "doubao-1.5-thinking-pro",
        "doubao-1.5-thinking-vision-pro",
        "doubao-thinking-pro",
        "doubao-thinking-vision-pro"
    ];
    
    let is_volces_thinking_model = volces_thinking_models.iter().any(|&model| {
        request.model_id.contains(model) || request.model_id == model
    });
    
    // Filter and format messages for Volces API
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
    
    // Use different request formats based on model type
    let request_body = if is_volces_thinking_model {
        // For thinking models, use OpenAI-compatible format
        json!({
            "model": request.model_id,
            "messages": api_messages,
            "stream": request.stream_enabled.unwrap_or(true),
            "temperature": request.temperature.unwrap_or(0.7),
            "max_tokens": request.max_tokens.unwrap_or(4096),
        })
    } else {
        // For regular models, use Volcengine format with parameters object
        json!({
            "model": request.model_id,
            "messages": api_messages,
            "stream": request.stream_enabled.unwrap_or(true),
            "parameters": {
                "temperature": request.temperature.unwrap_or(0.7),
                "max_new_tokens": request.max_tokens.unwrap_or(4096),
            }
        })
    };
    
    // Skip API call if API key is "None" to avoid errors
    if request.api_key == "None" {
        return Err(anyhow::anyhow!("API key is required but set to 'None'. Please set a valid API key."));
    }

    let response = client
        .post("https://ark.cn-beijing.volces.com/api/v3/chat/completions")
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
                parse_volces_stream_chunk(&text, is_volces_thinking_model)
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

fn parse_volces_stream_chunk(text: &str, is_thinking_model: bool) -> Result<StreamChunk> {
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
                // Handle OpenAI-compatible format for thinking models
                if let Some(choices) = parsed["choices"].as_array() {
                    if let Some(choice) = choices.get(0) {
                        // Handle streaming delta content
                        if let Some(delta) = choice.get("delta") {
                            // Handle reasoning content for Volcengine thinking models
                            if is_thinking_model {
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
                                    if !content_text.trim().is_empty() {
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
                eprintln!("Failed to parse Volcengine SSE data as JSON: {}", data_content);
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