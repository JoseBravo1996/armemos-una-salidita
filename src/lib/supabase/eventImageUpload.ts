import { createClient } from '@/lib/supabase/client';

const BUCKET = 'event-images';

function extFromFile(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'image/gif') return 'gif';
  return 'jpg';
}

/** Subida a Storage (`event-images/{userId}/{uuid}.ext`) y URL pública. */
export async function uploadPublicEventImage(
  userId: string,
  file: File
): Promise<string> {
  const supabase = createClient();
  const path = `${userId}/${crypto.randomUUID()}.${extFromFile(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
