import { SupabaseClient } from '@supabase/supabase-js';

export async function uploadPdf(
  supabase: SupabaseClient,
  file: File | Buffer,
  orgId: string,
  fileName: string
): Promise<{ path: string; error: string | null }> {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${orgId}/${timestamp}_${safeName}`;

  const { error } = await supabase.storage
    .from('po-pdfs')
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    return { path: '', error: error.message };
  }

  return { path, error: null };
}
