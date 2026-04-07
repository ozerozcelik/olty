import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/lib/supabase';

export interface ModerationResult {
  safe: boolean;
  unsafeLabels: string[];
  error?: string;
}

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

export const moderateImage = async (imageUri: string): Promise<ModerationResult> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { data, error } = await supabase.functions.invoke('moderate-image', {
      body: {
        imageBase64: base64,
        mimeType: getMimeType(imageUri),
      },
    });

    if (error) {
      console.error('Moderation error:', error);
      return { safe: true, unsafeLabels: [] };
    }

    return {
      safe: data?.safe ?? true,
      unsafeLabels: data?.unsafeLabels ?? [],
      error: data?.error,
    };
  } catch (error) {
    console.error('moderateImage error:', error);
    return { safe: true, unsafeLabels: [] };
  }
};
