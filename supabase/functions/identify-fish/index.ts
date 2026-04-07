// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REQUESTS_PER_DAY = 20;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_WEB_ORIGINS = (Deno.env.get('ALLOWED_WEB_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get('Origin');
  const allowedOrigin = origin && ALLOWED_WEB_ORIGINS.includes(origin)
    ? origin
    : null;

  return {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
    ...(allowedOrigin
      ? {
          'Access-Control-Allow-Origin': allowedOrigin,
          Vary: 'Origin',
        }
      : {}),
  };
};

const rejectDisallowedBrowserOrigin = (request: Request): Response | null => {
  const origin = request.headers.get('Origin');

  if (!origin || ALLOWED_WEB_ORIGINS.includes(origin)) {
    return null;
  }

  return new Response(JSON.stringify({ error: 'Origin not allowed.' }), {
    status: 403,
    headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
  });
};

const extractJsonText = (value: string): string => {
  const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = value.indexOf('{');
  const lastBrace = value.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return value.slice(firstBrace, lastBrace + 1);
  }

  return value.trim();
};

const getBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get('Authorization') ?? '';

  if (!authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
};

const getApproximateByteLength = (base64Value: string): number => {
  const paddingLength = base64Value.endsWith('==')
    ? 2
    : base64Value.endsWith('=')
      ? 1
      : 0;

  return Math.floor((base64Value.length * 3) / 4) - paddingLength;
};

const getAuthenticatedUser = async (request: Request) => {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
};

const consumeDailyQuota = async (userId: string): Promise<boolean> => {
  const { data, error } = await serviceClient.rpc('consume_function_quota', {
    p_user_id: userId,
    p_function_name: 'identify-fish',
    p_daily_limit: MAX_REQUESTS_PER_DAY,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data === true;
};

serve(async (req: Request): Promise<Response> => {
  const originError = rejectDisallowedBrowserOrigin(req);

  if (originError) {
    return originError;
  }

  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'imageBase64 and mimeType are required.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return new Response(JSON.stringify({ error: 'Unsupported image type.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (getApproximateByteLength(imageBase64) > MAX_IMAGE_BYTES) {
      return new Response(JSON.stringify({ error: 'Image is too large.' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const quotaAccepted = await consumeDailyQuota(user.id);

    if (!quotaAccepted) {
      return new Response(JSON.stringify({ error: 'Daily fish identification limit reached.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'low',
                },
              },
              {
                type: 'text',
                text: `Bu fotograftaki baligi tanimla. Sadece JSON formatinda yanit ver, baska hicbir sey yazma:
{
  "speciesName": "bilimsel veya Ingilizce tur adi",
  "speciesNameTr": "Turkce yaygin adi (Turkiye'de kullanilan)",
  "confidence": 0-100 arasi tahmin guveni,
  "description": "Kisa Turkce aciklama max 100 karakter",
  "funFact": "Ilginc bir bilgi Turkce max 150 karakter",
  "isEdible": true veya false,
  "averageSize": "Ortalama boy orn: 30-50 cm"
}
Eger fotografta balik yoksa veya emin degilsen: { "speciesName": null }`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('OpenAI response empty');
    }

    const result = JSON.parse(extractJsonText(text));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('identify-fish error:', message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
