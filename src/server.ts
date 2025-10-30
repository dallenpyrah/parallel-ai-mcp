import { Elysia } from 'elysia';
import { mcp } from 'elysia-mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const PARALLEL_API_URL = 'https://api.parallel.ai/v1beta/search';

async function parallelSearch(args: {
  objective?: string;
  search_queries?: string[];
  processor?: string;
  max_results?: number;
  max_chars_per_result?: number;
  source_policy?: Record<string, unknown>;
  api_key?: string;
}): Promise<string> {
  const { objective, search_queries, processor = 'base', max_results, max_chars_per_result, source_policy, api_key } = args;

  if (!objective && !search_queries) {
    return 'Error: At least one of \'objective\' or \'search_queries\' is required.';
  }

  const apiKeyToUse = api_key || (typeof process !== 'undefined' && process.env ? process.env.PARALLEL_API_KEY : undefined);

  if (!apiKeyToUse) {
    return (
      'Error: Parallel API key is required. Either pass it as \'api_key\' ' +
      'parameter, set PARALLEL_API_KEY environment variable, or configure ' +
      'it in your MCP client headers as \'x-api-key\'. ' +
      'Get your API key from https://parallel.ai'
    );
  }

  const requestBody: Record<string, unknown> = {
    processor,
  };

  if (objective) requestBody.objective = objective;
  if (search_queries) requestBody.search_queries = search_queries;
  if (max_results !== undefined) requestBody.max_results = max_results;
  if (max_chars_per_result !== undefined) requestBody.max_chars_per_result = max_chars_per_result;
  if (source_policy) requestBody.source_policy = source_policy;

  try {
    const response = await fetch(PARALLEL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyToUse,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return (
        `Error: Parallel Search API returned ${response.status}: ${errorText}`
      );
    }

    const data = await response.json() as {
      search_id?: string;
      results?: Array<{
        title?: string;
        url?: string;
        excerpts?: string[];
      }>;
    };

    if (!data.results || data.results.length === 0) {
      return (
        `Search completed (ID: ${data.search_id || 'unknown'}) but no results found.`
      );
    }

    const formattedResults = data.results.map((result) => {
      const title = result.title || 'No title';
      const url = result.url || 'No URL';
      const excerptText = (result.excerpts || []).join(' ');

      return `**${title}**\nURL: ${url}\n${excerptText}`;
    });

    const resultsText = formattedResults.join('\n\n---\n\n');
    return `Search ID: ${data.search_id || 'unknown'}\n\n${resultsText}`;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return 'Error: Request to Parallel Search API timed out';
    }
    return `Error calling Parallel Search API: ${error instanceof Error ? error.message : String(error)}`;
  }
}

const app = new Elysia()
  .get('/health', () => ({
    status: 'ok',
    server: 'Parallel Search MCP',
  }))
  .use(
    mcp({
      serverInfo: {
        name: 'Parallel Search MCP',
        version: '1.0.0',
      },
      capabilities: {
        tools: {},
      },
      setupServer: async (server: McpServer) => {
        server.tool(
          'parallel_search',
          {
            objective: z.string().max(5000).optional().describe(
              'Natural-language description of what the web research goal is. ' +
              'Include any source or freshness guidance. At least one of ' +
              'objective or search_queries is required. Max 5000 chars.'
            ),
            search_queries: z.array(z.string().max(200)).max(5).optional().describe(
              'Optional search queries to guide the search. Maximum 5 queries, ' +
              'each max 200 characters. At least one of objective or search_queries is required.'
            ),
            processor: z.enum(['base', 'pro']).default('base').describe(
              'Processor to use: \'base\' for fast, general queries; \'pro\' for ' +
              'complex research requiring higher quality and freshness.'
            ),
            max_results: z.number().int().positive().optional().describe(
              'Maximum number of search results to return.'
            ),
            max_chars_per_result: z.number().int().min(100).max(30000).optional().describe(
              'Maximum characters per search result excerpt. Minimum 100, maximum 30000.'
            ),
            source_policy: z.record(z.unknown()).optional().describe(
              'Source policy to control retrieval sources. Can include ' +
              'include_domains, exclude_domains, or other policy options.'
            ),
            api_key: z.string().optional().describe(
              'Your Parallel API key. Get it from https://parallel.ai'
            ),
          },
          async (args: {
            objective?: string;
            search_queries?: string[];
            processor?: string;
            max_results?: number;
            max_chars_per_result?: number;
            source_policy?: Record<string, unknown>;
            api_key?: string;
          }) => {
            const result = await parallelSearch(args);
            return {
              content: [{ type: 'text', text: result }],
            };
          }
        );
      },
    })
  );

if (typeof process !== 'undefined' && process?.env && process.env.VERCEL !== '1') {
  const port = Number(process.env.PORT) || 8000;
  app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}

export default app;
