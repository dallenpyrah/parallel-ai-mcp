"""Parallel Search MCP Server using FastMCP."""
import os
from typing import Optional, Dict, Any, List
from fastapi import FastAPI
from fastmcp import FastMCP
import httpx

mcp = FastMCP("Parallel Search MCP")

@mcp.tool()
async def parallel_search(
    objective: Optional[str] = None,
    search_queries: Optional[List[str]] = None,
    processor: str = "base",
    max_results: Optional[int] = None,
    max_chars_per_result: Optional[int] = None,
    source_policy: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
) -> str:
    """
    Search the web using Parallel Search API. Returns ranked, compressed excerpts
    optimized for LLMs. Ideal for agentic systems and LLM-based workflows that
    need web information.

    Args:
        objective: Natural-language description of what the web research goal is.
                  Include any source or freshness guidance. At least one of
                  objective or search_queries is required. Max 5000 chars.
        search_queries: Optional search queries to guide the search. Maximum 5
                       queries, each max 200 characters. At least one of
                       objective or search_queries is required.
        processor: Processor to use: 'base' for fast, general queries; 'pro' for
                  complex research requiring higher quality and freshness.
        max_results: Maximum number of search results to return.
        max_chars_per_result: Maximum characters per search result excerpt.
                             Minimum 100, maximum 30000.
        source_policy: Source policy to control retrieval sources. Can include
                      include_domains, exclude_domains, or other policy options.
        api_key: Your Parallel API key. Get it from https://parallel.ai

    Returns:
        Formatted search results with excerpts and URLs
    """
    if not objective and not search_queries:
        return "Error: At least one of 'objective' or 'search_queries' is required."

    api_key_to_use = api_key or os.environ.get("PARALLEL_API_KEY")

    if not api_key_to_use:
        return (
            "Error: Parallel API key is required. Either pass it as 'api_key' "
            "parameter, set PARALLEL_API_KEY environment variable, or configure "
            "it in your MCP client headers as 'x-api-key'. "
            "Get your API key from https://parallel.ai"
        )

    request_body: Dict[str, Any] = {
        "processor": processor
    }

    if objective:
        request_body["objective"] = objective
    if search_queries:
        request_body["search_queries"] = search_queries
    if max_results is not None:
        request_body["max_results"] = max_results
    if max_chars_per_result is not None:
        request_body["max_chars_per_result"] = max_chars_per_result
    if source_policy:
        request_body["source_policy"] = source_policy

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.parallel.ai/v1beta/search",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key_to_use,
                },
                json=request_body,
                timeout=60.0,
            )

            if response.status_code != 200:
                error_text = response.text
                return (
                    f"Error: Parallel Search API returned {response.status_code}: "
                    f"{error_text}"
                )

            data = response.json()

            if not data.get("results"):
                return (
                    f"Search completed (ID: {data.get('search_id', 'unknown')}) "
                    f"but no results found."
                )

            formatted_results = []
            for result in data["results"]:
                title = result.get("title", "No title")
                url = result.get("url", "No URL")
                excerpts = result.get("excerpts", [])
                excerpt_text = " ".join(excerpts)

                formatted_results.append(
                    f"**{title}**\n"
                    f"URL: {url}\n"
                    f"{excerpt_text}"
                )

            results_text = "\n\n---\n\n".join(formatted_results)
            return f"Search ID: {data.get('search_id')}\n\n{results_text}"

    except httpx.TimeoutException:
        return "Error: Request to Parallel Search API timed out"
    except Exception as e:
        return f"Error calling Parallel Search API: {str(e)}"


mcp_app = mcp.http_app()

app = FastAPI()

app.mount("/", mcp_app)

@app.get("/health")
async def health():
    return {"status": "ok", "server": "Parallel Search MCP"}

if __name__ == "__main__":
    mcp.run(transport="streamable-http", port=8000, stateless_http=True)
