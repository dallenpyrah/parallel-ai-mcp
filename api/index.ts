import app from '../src/server.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function toRequest(req: VercelRequest): Request {
  const url = `https://${req.headers.host || 'localhost'}${req.url || '/'}`;
  const headers = new Headers();
  
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach(v => headers.append(key, String(v)));
      } else {
        headers.set(key, String(value));
      }
    }
  });

  const init: RequestInit = {
    method: req.method || 'GET',
    headers,
  };

  if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
    if (typeof req.body === 'string') {
      init.body = req.body;
    } else if (req.body instanceof Buffer) {
      init.body = req.body.toString();
    } else {
      init.body = JSON.stringify(req.body);
    }
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
    const request = toRequest(req);
    const response = await app.fetch(request);
    await toResponse(res, response);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}



