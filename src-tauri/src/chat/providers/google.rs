use crate::chat::types::{ChatRequest, StreamChunk, ProxySettings};
use anyhow::Result;
use futures_util::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use std::time::Duration;
use std::pin::Pin;

pub async fn handle_google_request(request: ChatRequest) -> Result<Pin<Box<dyn futures_util::Stream<Item = Result<StreamChunk>> + Send>>> {
    let client = create_client(&request.proxy_settings)?;
    
    // Filter and format messages for Gemini API
    let mut gemini_messages = Vec::new();
    
    for msg in &request.messages {
        if (msg.role == "user" || msg.role == "assistant") && !msg.content.trim().is_empty() {
            gemini_messages.push(json!({
                "role": if msg.role == "assistant" { "model" } else { "user" },
                "parts": [{ "text": msg.content.trim() }]
            }));
        }
    }
    
    // Default message if no valid messages
    if gemini_messages.is_empty() {
        gemini_messages.push(json!({
            "role": "user",
            "parts": [{ "text": "Hello" }]
        }));
    }
    
    let mut payload = json!({
        "contents": gemini_messages,
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ],
        "generationConfig": {
            "temperature": request.temperature.unwrap_or(0.7),
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": request.max_tokens.unwrap_or(4096),
            "thinkingConfig": {
                "includeThoughts": true
            }
        }
    });
    
    // Add system instruction if provided
    if let Some(system_prompt) = &request.system_prompt {
        if !system_prompt.trim().is_empty() {
            payload["systemInstruction"] = json!({
                "parts": [{ "text": system_prompt.trim() }]
            });
        }
    }
    
    // Use streaming endpoint if streaming is enabled
    let stream_enabled = request.stream_enabled.unwrap_or(true);
    let endpoint = if stream_enabled {
        "streamGenerateContent?alt=sse"
    } else {
        "generateContent"
    };
    
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:{}{}key={}",
        request.model_id,
        endpoint,
        if stream_enabled { "&" } else { "?" },
        request.api_key
    );
    
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&payload)
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
                parse_google_stream_chunk(&text)
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

fn parse_google_stream_chunk(text: &str) -> Result<StreamChunk> {
    let mut content = None;
    let thinking_content = None;
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
                // Handle Gemini response format
                if let Some(candidates) = parsed["candidates"].as_array() {
                    if let Some(candidate) = candidates.get(0) {
                        if let Some(content_obj) = candidate.get("content") {
                            if let Some(parts) = content_obj["parts"].as_array() {
                                for part in parts {
                                    if let Some(text) = part["text"].as_str() {
                                        // Note: As of early 2025, Google discontinued thinking content in API responses
                                        // Thinking still happens internally but is not exposed via the API
                                        // Only regular content is available
                                        content = Some(text.to_string());
                                    }
                                }
                            }
                        }
                        
                        // Check for finish reason to mark completion
                        if let Some(finish_reason) = candidate["finishReason"].as_str() {
                            if finish_reason == "STOP" {
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