"""Vercel serverless function entry point for MCP server."""
from src.server import app as starlette_app

app = starlette_app
