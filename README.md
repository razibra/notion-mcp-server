# Notion MCP Server

A Model Context Protocol (MCP) server that provides seamless integration with Notion, allowing AI assistants like Claude to read and write Notion pages, manage databases, and more.

## Features

- 📄 **Page Management**: Create, read, update, and delete Notion pages
- 📊 **Database Operations**: Query and manipulate Notion databases
- 🔍 **Search**: Search across your Notion workspace
- ✏️ **Rich Text Support**: Handle formatted text, headings, lists, and more
- 🔗 **Block Management**: Add and modify various block types
- 🏷️ **Property Support**: Work with all Notion property types

## Installation

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Notion API key (get one at [notion.so/my-integrations](https://www.notion.so/my-integrations))

### Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/notion-mcp-server.git
cd notion-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your Notion API key
```

4. Build the project:
```bash
npm run build
```

5. Test the server:
```bash
npm test
```

## Configuration

### Environment Variables

Create a `.env` file with the following:

```env
# Required
NOTION_API_KEY=your_notion_integration_token

# Optional
NOTION_API_VERSION=2022-06-28
LOG_LEVEL=info
```

### Claude Desktop Configuration

Add to your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": ["path/to/notion-mcp-server/dist/index.js"],
      "env": {
        "NOTION_API_KEY": "your_notion_integration_token"
      }
    }
  }
}
```

## Available Tools

### Page Operations

- `notion_create_page` - Create a new Notion page
- `notion_get_page` - Retrieve page content and properties
- `notion_update_page` - Update page properties or content
- `notion_delete_page` - Delete a page (move to trash)

### Database Operations

- `notion_query_database` - Query a database with filters and sorts
- `notion_create_database_item` - Add new item to a database
- `notion_update_database_item` - Update database item properties

### Block Operations

- `notion_append_blocks` - Add blocks to a page
- `notion_get_blocks` - Get child blocks of a page or block
- `notion_update_block` - Update existing block content

### Search

- `notion_search` - Search pages and databases in workspace

## Usage Examples

### Create a Page

```
Use notion_create_page to create a new page titled "Meeting Notes" in the workspace
```

### Query Database

```
Use notion_query_database to find all tasks with status "In Progress" from database [database_id]
```

### Search Workspace

```
Use notion_search to find all pages containing "quarterly report"
```

## Development

### Project Structure

```
notion-mcp-server/
├── src/
│   ├── index.ts           # Main MCP server
│   ├── notion-client.ts   # Notion API client wrapper
│   ├── tools/            # Individual tool implementations
│   │   ├── pages.ts
│   │   ├── databases.ts
│   │   ├── blocks.ts
│   │   └── search.ts
│   └── types/            # TypeScript types
├── test/                 # Test files
├── docs/                 # Documentation
└── examples/            # Usage examples
```

### Running in Development

```bash
npm run dev
```

### Code Style

This project uses ESLint and Prettier. Run before committing:

```bash
npm run lint
npm run format
```

## Notion Setup

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name and select capabilities
4. Copy the integration token
5. Share your Notion pages/databases with the integration

## Security

- Never commit your Notion API key
- Use environment variables for sensitive data
- Limit integration permissions to what's needed
- Regularly rotate API keys

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for use with [Claude](https://claude.ai) and the Model Context Protocol
- Uses the official [Notion API](https://developers.notion.com/)

## Support

- 🐛 [Report bugs](https://github.com/yourusername/notion-mcp-server/issues)
- 💡 [Request features](https://github.com/yourusername/notion-mcp-server/issues)
- 📖 [Read the docs](./docs)