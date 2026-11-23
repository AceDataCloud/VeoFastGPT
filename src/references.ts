import z from 'zod';
const httpsUrl = z.string().url().startsWith('https://');
import { ACTIONS } from './model-catalog.ts';
export const referenceInputs = {
  action: z.enum(ACTIONS).default('text2video').meta({ title: 'Mode', description: 'Use image or ingredient mode when supplying reference images.' }),
  imageUrls: z.array(httpsUrl).min(1).max(3).optional().meta({ title: 'Frame or ingredient image URLs' })
};
const schema = z.object(referenceInputs);
export type ReferenceInput = z.input<typeof schema>;
export function referencePayload(input: ReferenceInput & { model: string }) {
  const refs = schema.parse(input);
  if (refs.action !== 'text2video' && !refs.imageUrls?.length) throw new Error('Image and ingredient modes require reference images.');
  if (input.model === 'veo31-fast-ingredients' && (refs.action === 'text2video' || !refs.imageUrls?.length)) throw new Error('The ingredients model requires image or ingredient mode and reference images.');
  if (input.model !== 'veo31-fast-ingredients' && (refs.imageUrls?.length ?? 0) > 2) throw new Error('This model supports at most two frame images.');
  return { action: refs.action, ...(refs.imageUrls ? { image_urls: refs.imageUrls } : {}) };
}
