import { describe, it, expect, vi } from 'vitest';

describe('getProviderMode', () => {
  it('returns "hybrid" by default', async () => {
    vi.stubEnv('VISION_PROVIDER', '');
    const { getProviderMode } = await import('../vision-provider');
    expect(getProviderMode()).toBe('hybrid');
  });

  it('returns "deepseek" when set', async () => {
    vi.stubEnv('VISION_PROVIDER', 'deepseek');
    const { getProviderMode } = await import('../vision-provider');
    expect(getProviderMode()).toBe('deepseek');
  });

  it('returns "mistral" when set', async () => {
    vi.stubEnv('VISION_PROVIDER', 'mistral');
    const { getProviderMode } = await import('../vision-provider');
    expect(getProviderMode()).toBe('mistral');
  });

  it('is case-insensitive', async () => {
    vi.stubEnv('VISION_PROVIDER', 'DeepSeek');
    const { getProviderMode } = await import('../vision-provider');
    expect(getProviderMode()).toBe('deepseek');
  });

  it('returns "hybrid" for unknown values', async () => {
    vi.stubEnv('VISION_PROVIDER', 'invalid');
    const { getProviderMode } = await import('../vision-provider');
    expect(getProviderMode()).toBe('hybrid');
  });
});
