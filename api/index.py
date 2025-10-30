"""Vercel serverless function entry point for MCP server."""
from src.server import app

handler = app
