import { afterEach, expect, test, vi } from 'vitest';
import plugin from '../index.ts';
import { submitGeneration } from './client.ts';
import { MODELS } from './model-catalog.ts';
const image = 'https://example.com/authorized.png';
const video = 'https://example.com/authorized.mp4';
const audio = 'https://example.com/authorized.mp3';
const handler = plugin.getToolHandler('generate')!;
afterEach(() => vi.unstubAllGlobals());
async function capture(values: Record<string, unknown>) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ task_id: 'one-submission', status: 'pending' }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const input = handler.inputSchema.parse({ prompt: 'One blue paper sphere', ...values });
  await submitGeneration(input, 'test-key');
  expect(fetch).toHaveBeenCalledTimes(1);
  return JSON.parse(fetch.mock.calls[0]![1].body);
}
test('keeps exact custom model IDs available', () => {
  expect(handler.inputSchema.parse({ prompt: 'One blue paper sphere', model: 'future-custom-model' }).model).toBe('future-custom-model');
});

for (const model of MODELS) test(`preserves ${model} and its required references`, async () => {
  const values = model === 'veo31-fast-ingredients' ? { action: 'ingredients2video', imageUrls: [image] } : { action: 'text2video' };
  const body = await capture({ model, ...values });
  expect(body.model).toBe(model);
  expect(body.action).toBe(values.action);
  if ('imageUrls' in values) expect(body.image_urls).toEqual([image]);
});
test('supports frame input and validates ingredient or frame counts before transport', async () => {
  expect((await capture({ model: 'veo3', action: 'image2video', imageUrls: [image, image] })).image_urls).toEqual([image, image]);
  await expect(capture({ model: 'veo31-fast-ingredients' })).rejects.toThrow('requires');
  expect(fetch).not.toHaveBeenCalled();
  await expect(capture({ action: 'image2video' })).rejects.toThrow('require');
  expect(fetch).not.toHaveBeenCalled();
  await expect(capture({ model: 'veo3', action: 'image2video', imageUrls: [image, image, image] })).rejects.toThrow('two');
  expect(fetch).not.toHaveBeenCalled();
});
