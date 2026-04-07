import { Image } from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';

import { supabase } from '@/lib/supabase';

interface ImageSize {
  width: number;
  height: number;
}

interface UploadOptions {
  bucket: string;
  path: string;
  maxDimension: number;
  quality: number;
  upsert: boolean;
}

const getImageSize = async (uri: string): Promise<ImageSize> => {
  return new Promise<ImageSize>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
};

const uploadImage = async (uri: string, options: UploadOptions): Promise<string> => {
  const { width, height } = await getImageSize(uri);
  const maxDimension = Math.max(width, height);
  const actions =
    maxDimension > options.maxDimension
      ? width >= height
        ? [{ resize: { width: options.maxDimension } }]
        : [{ resize: { height: options.maxDimension } }]
      : [];
  const manipulated = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: options.quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { error: uploadError } = await supabase.storage
    .from(options.bucket)
    .upload(options.path, decode(base64), {
      contentType: 'image/jpeg',
      upsert: options.upsert,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(options.bucket).getPublicUrl(options.path);

  return data.publicUrl;
};

export const uploadCatchPhoto = async (uri: string, userId: string): Promise<string> => {
  return uploadImage(uri, {
    bucket: 'catch-photos',
    path: `${userId}/${Date.now()}.jpg`,
    maxDimension: 1200,
    quality: 0.8,
    upsert: false,
  });
};

export const uploadAvatar = async (uri: string, userId: string): Promise<string> => {
  return uploadImage(uri, {
    bucket: 'avatars',
    path: `${userId}/avatar.jpg`,
    maxDimension: 800,
    quality: 0.85,
    upsert: true,
  });
};

export const uploadGearPhoto = async (uri: string, userId: string): Promise<string> => {
  return uploadImage(uri, {
    bucket: 'gear-photos',
    path: `${userId}/${Date.now()}.jpg`,
    maxDimension: 1200,
    quality: 0.8,
    upsert: false,
  });
};

export const uploadPostImageAsset = async (uri: string, userId: string): Promise<string> => {
  return uploadImage(uri, {
    bucket: 'catch-photos',
    path: `posts/${userId}/${Date.now()}.jpg`,
    maxDimension: 1400,
    quality: 0.82,
    upsert: false,
  });
};
