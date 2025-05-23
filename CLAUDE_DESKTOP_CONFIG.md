# Claude Desktop Configuration for Notion MCP Server

## Windows Configuration

Add this to your Claude Desktop config file at `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["C:\\path\\to\\notion-mcp-server\\dist\\index.js"],
      "env": {
        "NOTION_API_KEY": "your-notion-integration-token-here"
      }
    }
  }
}
```

## Important Notes

1. **Replace the path**: Change `C:\\path\\to\\notion-mcp-server` to your actual installation path
2. **Use double backslashes**: Windows paths need `\\` not single `\`
3. **Add your Notion API key**: Replace `your-notion-integration-token-here` with your actual key

## Getting Your Notion API Key

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Give it a name (e.g., "Claude MCP")
4. Select the capabilities you need
5. Click "Submit"
6. Copy the "Internal Integration Token"
7. Share your Notion pages/databases with the integration

## Testing the Connection

After configuring:
1. Restart Claude Desktop completely
2. In Claude, type: "What Notion tools are available?"
3. You should see a list of 14 Notion tools

## Troubleshooting

### Server Disconnected Error
- Make sure Node.js is installed and in your PATH
- Verify the path to `dist/index.js` is correct
- Check that the server was built: `npm run build`

### No Tools Available
- Verify your Notion API key is correct
- Check that the key is in the `env` section of the config
- Make sure you've shared at least one page with your integration

### Deprecation Warning
The punycode deprecation warning is harmless and comes from the Notion SDK. It doesn't affect functionality.

## Example Configuration (Full Path)

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["C:\\Users\\YourName\\Projects\\notion-mcp-server\\dist\\index.js"],
      "env": {
        "NOTION_API_KEY": "secret_abcd1234..."
      }
    }
  }
}
```