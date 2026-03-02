import { supabase } from './supabase';

const BUCKET_NAME = 'fai-artifacts';

export const uploadFile = async (file: File, path: string) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Supabase Storage Upload Error:', error);
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);

  return { path: data.path, url: publicUrl };
};

export const getFileUrl = (path: string) => {
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  return publicUrl;
};
