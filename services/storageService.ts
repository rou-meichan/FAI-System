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

  return { path: data.path };
};

export const getFileUrl = async (path: string, expiresIn: number = 3600) => {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);
  
  if (error) {
    console.error('Error creating signed URL:', error);
    // Fallback to public URL if signed URL fails (maybe it's public)
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);
    return publicUrl;
  }
  
  return data.signedUrl;
};
