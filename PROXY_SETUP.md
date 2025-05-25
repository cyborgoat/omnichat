# Proxy Setup for Gemini API

This application now supports proxy configuration for Gemini API calls. This is useful when you need to route your API requests through a proxy server.

## Supported Proxy Types

- **HTTP Proxy**: For HTTP connections
- **HTTPS Proxy**: For HTTPS connections  
- **SOCKS Proxy**: For SOCKS4/SOCKS5 connections (recommended)

## How to Configure

1. **Open Settings**: Click the Settings icon in the left sidebar
2. **Go to Proxy Tab**: Click on the "Proxy" tab in the settings dialog
3. **Enter Proxy Details**: Fill in the appropriate proxy URL(s)
4. **Save Settings**: Click "Save Proxy Settings"

## Proxy URL Formats

### SOCKS Proxy (Recommended)
```
socks5://127.0.0.1:7890
socks4://127.0.0.1:1080
```

### HTTP/HTTPS Proxy
```
http://127.0.0.1:8080
https://127.0.0.1:8080
```

### With Authentication
```
socks5://username:password@127.0.0.1:7890
http://username:password@127.0.0.1:8080
```

## Priority Order

The proxy selection follows this priority:
1. **SOCKS Proxy** (highest priority)
2. **HTTPS Proxy** (for HTTPS requests)
3. **HTTP Proxy** (fallback)

## Testing Your Setup

1. Configure your proxy settings in the app
2. Select a Gemini model (e.g., "Gemini 1.5 Pro")
3. Send a test message
4. Check the browser console for proxy connection logs

## Troubleshooting

### Common Issues

1. **Connection Timeout**: 
   - Verify your proxy server is running
   - Check the proxy URL format
   - Test with curl: `curl -x socks5://127.0.0.1:7890 https://www.google.com`

2. **Authentication Failed**:
   - Ensure username/password are correct
   - Some proxies may not support authentication

3. **Proxy Not Working**:
   - Clear all proxy settings and try again
   - Check if your proxy supports the target domain
   - Try different proxy types (SOCKS vs HTTP)

### Console Logs

When proxy is configured, you'll see logs like:
```
🔧 Creating proxy agent: isHttps=true, settings= {socks: "socks5://127.0.0.1:7890"}
📡 Creating SocksProxyAgent with: socks5://127.0.0.1:7890
[GEMINI] Using proxy agent: true
```

## Notes

- Proxy settings only apply to **Gemini API calls**
- Other providers (OpenAI, Anthropic, etc.) use their respective SDKs which may have different proxy configurations
- Settings are automatically saved and persist between sessions
- Leave proxy fields empty to disable proxy for that protocol

## Example: Using with Local SOCKS Proxy

If you have a SOCKS proxy running on `127.0.0.1:7890`:

1. Open Settings → Proxy tab
2. Enter `socks5://127.0.0.1:7890` in the SOCKS Proxy field
3. Leave HTTP and HTTPS fields empty
4. Click "Save Proxy Settings"
5. Test with a Gemini model

The application will now route all Gemini API requests through your SOCKS proxy. 