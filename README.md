# Parallel Search MCP Server

A Model Context Protocol (MCP) server for Parallel Search API, deployed on Vercel.

## Deployment

### Quick Deploy

1. Fork this repository
2. Connect to Vercel: https://vercel.com/new
3. Deploy!
4. Your MCP server will be available at: `https://your-project.vercel.app/mcp`

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python src/server.py

# Test with MCP Inspector
npx @modelcontextprotocol/inspector@latest http://localhost:8000/mcp
```

## Usage with Cursor

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "parallel-search": {
      "url": "https://your-deployment.vercel.app/mcp",
      "headers": {
        "x-api-key": "YOUR_PARALLEL_API_KEY"
      }
    }
  }
}
```

**Note:** Each user needs their own Parallel API key from https://parallel.ai

## Features

- 🔍 Web search with natural language objectives
- 🚀 Fast deployment on Vercel serverless
- 🔐 User-provided API keys (no cost to server owner)
- 📊 Ranked, LLM-optimized results with citations
- ⚙️ Customizable processors (base/pro)

## Tool: `parallel_search`

### Parameters

- `objective` (optional): Natural language search goal
- `search_queries` (optional): List of specific queries (max 5)
- `processor` (optional): "base" (default) or "pro"
- `max_results` (optional): Limit number of results
- `max_chars_per_result` (optional): Control excerpt length (100-30000)
- `source_policy` (optional): Include/exclude specific domains
- `api_key` (optional): Your Parallel API key (or set via headers)

### Example

In Cursor/Claude:
```
Search for "latest developments in quantum computing" using parallel_search
```

## License

MIT
