// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID')!;
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY')!;
const AWS_REGION = Deno.env.get('AWS_REGION') ?? 'eu-west-1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const getSignatureKey = async (
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const kDate = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`AWS4${key}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const kDateSigned = await crypto.subtle.sign('HMAC', kDate, encoder.encode(dateStamp));
  const kRegion = await crypto.subtle.importKey(
    'raw',
    kDateSigned,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const kRegionSigned = await crypto.subtle.sign('HMAC', kRegion, encoder.encode(regionName));
  const kService = await crypto.subtle.importKey(
    'raw',
    kRegionSigned,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const kServiceSigned = await crypto.subtle.sign('HMAC', kService, encoder.encode(serviceName));
  const kSigning = await crypto.subtle.importKey(
    'raw',
    kServiceSigned,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  return crypto.subtle.sign('HMAC', kSigning, encoder.encode('aws4_request'));
};

const sha256Hex = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));

  return Array.from(new Uint8Array(hash))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
};

const hmacHex = async (key: ArrayBuffer, data: string): Promise<string> => {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));

  return Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ safe: false, error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = JSON.stringify({
      Image: { Bytes: imageBase64 },
      MinConfidence: 70,
    });

    const service = 'rekognition';
    const host = `rekognition.${AWS_REGION}.amazonaws.com`;
    const endpoint = `https://${host}/`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = await sha256Hex(requestBody);
    const canonicalHeaders =
      `content-type:application/x-amz-json-1.1\n` +
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n` +
      `x-amz-target:RekognitionService.DetectModerationLabels\n`;
    const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';

    const canonicalRequest = [
      'POST',
      '/',
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${AWS_REGION}/${service}/aws4_request`;
    const canonicalRequestHash = await sha256Hex(canonicalRequest);
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
    const signingKey = await getSignatureKey(
      AWS_SECRET_ACCESS_KEY,
      dateStamp,
      AWS_REGION,
      service,
    );
    const signature = await hmacHex(signingKey, stringToSign);
    const authorizationHeader =
      `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Date': amzDate,
        'X-Amz-Target': 'RekognitionService.DetectModerationLabels',
        Authorization: authorizationHeader,
        Host: host,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rekognition error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const labels = data.ModerationLabels ?? [];
    const unsafeCategories = [
      'Explicit Nudity',
      'Nudity',
      'Graphic Male Nudity',
      'Graphic Female Nudity',
      'Sexual Activity',
      'Illustrated Explicit Nudity',
      'Adult Toys',
      'Violence',
      'Graphic Violence Or Gore',
      'Physical Violence',
      'Weapon Violence',
      'Weapons',
      'Self Injury',
    ];
    const unsafeLabels = labels.filter((label: any) =>
      unsafeCategories.some(
        (category) =>
          label.Name?.includes(category) || label.ParentName?.includes(category),
      ) && label.Confidence > 70,
    );
    const safe = unsafeLabels.length === 0;

    return new Response(
      JSON.stringify({
        safe,
        labels: labels.map((label: any) => ({
          name: label.Name,
          confidence: label.Confidence,
        })),
        unsafeLabels: unsafeLabels.map((label: any) => label.Name),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('moderate-image error:', message);

    return new Response(JSON.stringify({ safe: true, error: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
