use crate::chat::types::{ChatRequest, StreamChunk, Provider};
use crate::chat::providers::{
    openai::handle_openai_request,
    anthropic::handle_anthropic_request,
    google::handle_google_request,
    deepseek::handle_deepseek_request,
    qwen::handle_qwen_request,
    volces::handle_volces_request,
    custom::handle_custom_request,
};
use anyhow::Result;
use futures_util::StreamExt;
use std::str::FromStr;
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn handle_chat_stream(
    app_handle: AppHandle,
    request: ChatRequest,
    stream_id: String,
) -> Result<(), String> {
    let provider = Provider::from_str(&request.provider)
        .map_err(|e| format!("Invalid provider: {}", e))?;
    
    // Route to appropriate provider
    let stream_result = match provider {
        Provider::OpenAI => handle_openai_request(request).await,
        Provider::Anthropic => handle_anthropic_request(request).await,
        Provider::Google => handle_google_request(request).await,
        Provider::Deepseek => handle_deepseek_request(request).await,
        Provider::Qwen => handle_qwen_request(request).await,
        Provider::Volces => handle_volces_request(request).await,
        Provider::Custom => handle_custom_request(request).await,
    };
    
    match stream_result {
        Ok(mut stream) => {
            // Process the stream and emit events to the frontend
            tokio::spawn(async move {
                while let Some(chunk_result) = stream.next().await {
                    match chunk_result {
                        Ok(chunk) => {
                            // Emit the chunk to the frontend
                            if let Err(e) = app_handle.emit(&format!("chat-stream-{}", stream_id), &chunk) {
                                log::error!("Failed to emit stream chunk: {}", e);
                                break;
                            }
                            
                            // If this is the final chunk, break the loop
                            if chunk.done {
                                break;
                            }
                        }
                        Err(e) => {
                            // Emit error chunk
                            let error_chunk = StreamChunk {
                                content: None,
                                thinking_content: None,
                                error: Some(format!("Stream error: {}", e)),
                                done: true,
                            };
                            
                            if let Err(emit_error) = app_handle.emit(&format!("chat-stream-{}", stream_id), &error_chunk) {
                                log::error!("Failed to emit error chunk: {}", emit_error);
                            }
                            break;
                        }
                    }
                }
                
                // Emit final done event
                let final_chunk = StreamChunk {
                    content: None,
                    thinking_content: None,
                    error: None,
                    done: true,
                };
                
                if let Err(e) = app_handle.emit(&format!("chat-stream-{}", stream_id), &final_chunk) {
                    log::error!("Failed to emit final chunk: {}", e);
                }
            });
            
            Ok(())
        }
        Err(e) => {
            // Emit error immediately
            let error_chunk = StreamChunk {
                content: None,
                thinking_content: None,
                error: Some(format!("Provider error: {}", e)),
                done: true,
            };
            
            if let Err(emit_error) = app_handle.emit(&format!("chat-stream-{}", stream_id), &error_chunk) {
                log::error!("Failed to emit immediate error: {}", emit_error);
            }
            
            Err(format!("Chat request failed: {}", e))
        }
    }
} 