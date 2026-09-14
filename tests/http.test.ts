import { it, expect } from 'vitest';
import { localRequest, jsonBody } from '../src/infrastructure/http';
it('valida Origin contra Host visible aunque Next normalice la URL', () => {
  expect(() =>
    localRequest(
      new Request('http://localhost:3000/api/auth', {
        headers: {
          host: '127.0.0.1:3000',
          origin: 'http://127.0.0.1:3000',
          'content-type': 'application/json',
        },
      }),
      true,
    ),
  ).not.toThrow();
});
it('rechaza orígenes cruzados y no confía en X-Forwarded-Host', () => {
  expect(() =>
    localRequest(
      new Request('http://localhost:3000/api/auth', {
        headers: {
          host: '127.0.0.1:3000',
          origin: 'https://evil.example',
          'x-forwarded-host': 'evil.example',
          'content-type': 'application/json',
        },
      }),
      true,
    ),
  ).toThrow('Origen');
  expect(() =>
    localRequest(
      new Request('http://localhost:3000/api/auth', { headers: { host: 'public.example' } }),
    ),
  ).toThrow('local');
});
it('rechaza JSON inválido y cuerpos grandes aunque no indiquen content-length', async () => {
  await expect(
    jsonBody(new Request('http://localhost', { method: 'POST', body: '{bad' })),
  ).rejects.toThrow('JSON');
  await expect(
    jsonBody(new Request('http://localhost', { method: 'POST', body: 'x'.repeat(33000) })),
  ).rejects.toMatchObject({ status: 413 });
});
