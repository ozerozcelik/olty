import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';
import type { FishIdResult } from '@/types/app.types';

const getMimeType = (imageUri: string): string => {
  const normalizedUri = imageUri.toLowerCase();

  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
};

export const identifyFish = async (imageUri: string): Promise<FishIdResult> => {
  const sessionResponse = await supabase.auth.getSession();
  const accessToken = sessionResponse.data.session?.access_token;

  if (!accessToken) {
    throw new Error('Balık tanıma için oturum gerekli.');
  }

  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { data, error } = await supabase.functions.invoke('identify-fish', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: { imageBase64: base64, mimeType: getMimeType(imageUri) },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as FishIdResult;
};
