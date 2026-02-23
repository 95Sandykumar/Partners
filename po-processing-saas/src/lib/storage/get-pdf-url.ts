import { SupabaseClient } from '@supabase/supabase-js';

export async function getPdfUrl(
  supabase: SupabaseClient,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('po-pdfs')
    .createSignedUrl(path, expiresIn);

  if (error || !data) return null;
  return data.signedUrl;
}
