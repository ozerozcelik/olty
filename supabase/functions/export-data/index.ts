// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const getBearerToken = (request: Request): string | null => {
  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.slice('Bearer '.length).trim() || null;
};

serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Auth check
  const token = getBearerToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { data: { user }, error: authError } = await authClient.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const userId = user.id;

  try {
    // Fetch all user data
    const [
      profileResult,
      catchesResult,
      commentsResult,
      likesResult,
      followersResult,
      followingResult,
      badgesResult,
      gearResult,
      notificationsResult,
      consentsResult,
      gameAnswersResult,
    ] = await Promise.all([
      serviceClient.from('profiles').select('*').eq('id', userId).single(),
      serviceClient.from('catches').select('*').eq('user_id', userId),
      serviceClient.from('comments').select('*').eq('user_id', userId),
      serviceClient.from('likes').select('*').eq('user_id', userId),
      serviceClient.from('follows').select('*').eq('following_id', userId),
      serviceClient.from('follows').select('*').eq('follower_id', userId),
      serviceClient.from('user_badges').select('*, badges(*)').eq('user_id', userId),
      serviceClient.from('user_gear').select('*').eq('user_id', userId),
      serviceClient.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      serviceClient.from('user_consents').select('*').eq('user_id', userId),
      serviceClient.from('daily_game_answers').select('*').eq('user_id', userId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profileResult.data,
      catches: catchesResult.data ?? [],
      comments: commentsResult.data ?? [],
      likes: likesResult.data ?? [],
      followers: followersResult.data ?? [],
      following: followingResult.data ?? [],
      badges: badgesResult.data ?? [],
      gear: gearResult.data ?? [],
      notifications: notificationsResult.data ?? [],
      consents: consentsResult.data ?? [],
      gameAnswers: gameAnswersResult.data ?? [],
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="olty-data-export-${userId}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
