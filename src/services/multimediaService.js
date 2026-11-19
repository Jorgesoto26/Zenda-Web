import { supabase } from '../lib/supabase';

export async function uploadEvidence(file, bucket = 'Evidencias', folder = 'comprobantes') {
  if (!file) throw new Error('No se seleccionó ningún archivo');

  const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw error;
  return data?.path || fileName;
}

export async function getSignedEvidenceUrl(filePath, bucket = 'Evidencias') {
  if (!filePath) return null;
  if (filePath.startsWith('http') || filePath.startsWith('data:') || filePath.startsWith('blob:')) {
    return filePath;
  }
  try {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch (e) {
    console.warn('Error en getSignedEvidenceUrl:', e);
  }
  return null;
}

export const getSignedUrl = getSignedEvidenceUrl;

