import { NextRequest } from 'next/server';

export function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): NextRequest {
  const url = 'http://localhost:3000/api/test';
  const init: RequestInit = {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

export function createMockFormDataRequest(formData: FormData): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    body: formData,
    headers: { 'x-forwarded-for': '127.0.0.1' },
  });
}
