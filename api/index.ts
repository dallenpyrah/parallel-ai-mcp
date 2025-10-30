import app from '../src/server.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

async function getRequestBody(req: VercelRequest): Promise<string | undefined> {
  if (!req.body) {
    return undefined;
  }
  
  if (typeof req.body === 'string') {
    return req.body;
  }
  
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf-8');
  }
  
  if (typeof req.body === 'object') {
    return JSON.stringify(req.body);
  }
  
  return undefined;
}

function toRequest(req: VercelRequest, body?: string): Request {
  const url = `https://${req.headers.host || 'localhost'}${req.url || '/'}`;
  const headers = new Headers();
  
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value && key.toLowerCase() !== 'content-length') {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, String(v)));
      } else {
        headers.set(key, String(value));
      }
    }
  });

  if (!headers.has('accept') && req.url === '/mcp') {
    headers.set('accept', 'application/json, text/event-stream');
  }

  if (body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const init: RequestInit = {
    method: req.method || 'GET',
    headers,
  };

  if (body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    init.body = body;
  }

  return new Request(url, init);
}

async function toResponse(res: VercelResponse, response: Response): Promise<void> {
  res.statusCode = response.status;
  res.statusMessage = response.statusText;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await response.text();
  if (body) {
    res.send(body);
  } else {
    res.end();
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const body = await getRequestBody(req);
    const request = toRequest(req, body);
    
    console.log('Request URL:', req.url);
    console.log('Request method:', req.method);
    console.log('Request headers:', JSON.stringify(req.headers));
    console.log('Body length:', body?.length || 0);
    
    const response = await app.fetch(request);
    await toResponse(res, response);
  } catch (error) {
    console.error('Error handling request:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : String(error));
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}




