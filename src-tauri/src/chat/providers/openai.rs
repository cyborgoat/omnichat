use crate::chat::types::{ChatRequest, StreamChunk, ProxySettings};
use anyhow::Result;
use futures_util::{StreamExt, stream};
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use std::pin::Pin;

pub async fn handle_openai_request(request: ChatRequest) -> Result<Pin<Box<dyn futures_util::Stream<Item = Result<StreamChunk>> + Send>>> {
    let client = create_client(&request.proxy_settings)?;
    
    // Prepare messages for OpenAI API
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
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", request.api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await?;
    
    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(anyhow::anyhow!("OpenAI API error: {}", error_text));
    }
    
    if request.stream_enabled.unwrap_or(true) {
        let stream = response.bytes_stream()
            .map(|chunk_result| {
                match chunk_result {
                    Ok(chunk) => {
                        let chunk_str = String::from_utf8_lossy(&chunk);
                        parse_openai_stream_chunk(&chunk_str)
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
    } else {
        // Handle non-streaming response
        let response_data: Value = response.json().await?;
        let content = response_data["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();
        
        let chunk = StreamChunk {
            content: if content.is_empty() { None } else { Some(content) },
            thinking_content: None,
            error: None,
            done: true,
        };
        
        let stream = stream::once(async { Ok(chunk) });
        Ok(Box::pin(stream))
    }
}

fn create_client(proxy_settings: &Option<ProxySettings>) -> Result<Client> {
    let mut builder = Client::builder()
        .timeout(Duration::from_secs(60))
        .use_rustls_tls();
    
    if let Some(proxy) = proxy_settings {
        if proxy.enabled {
            let proxy_url = proxy.socks5.as_ref()
                .or(proxy.https.as_ref())
                .or(proxy.http.as_ref());
            
            if let Some(url) = proxy_url {
                let reqwest_proxy = reqwest::Proxy::all(url)?;
                builder = builder.proxy(reqwest_proxy);
            }
        }
    }
    
    Ok(builder.build()?)
}

fn parse_openai_stream_chunk(chunk_str: &str) -> Result<StreamChunk> {
    for line in chunk_str.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        
        if line.starts_with("data: ") {
            let data_content = &line[6..];
            
            if data_content == "[DONE]" {
                return Ok(StreamChunk {
                    content: None,
                    thinking_content: None,
                    error: None,
                    done: true,
                });
            }
            
            match serde_json::from_str::<Value>(data_content) {
                Ok(parsed) => {
                    if let Some(error) = parsed.get("error") {
                        return Ok(StreamChunk {
                            content: None,
                            thinking_content: None,
                            error: Some(error.to_string()),
                            done: true,
                        });
                    }
                    
                    if let Some(choices) = parsed["choices"].as_array() {
                        if let Some(choice) = choices.first() {
                            if let Some(delta) = choice.get("delta") {
                                if let Some(content) = delta["content"].as_str() {
                                    return Ok(StreamChunk {
                                        content: Some(content.to_string()),
                                        thinking_content: None,
                                        error: None,
                                        done: false,
                                    });
                                }
                            }
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Failed to parse OpenAI stream chunk: {}", e);
                }
            }
        }
    }
    
    Ok(StreamChunk {
        content: None,
        thinking_content: None,
        error: None,
        done: false,
    })
} 