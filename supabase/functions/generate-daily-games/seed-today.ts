// @ts-nocheck
const endpoint = Deno.env.get('SUPABASE_FUNCTION_URL') ?? '';
const cronSharedSecret = Deno.env.get('CRON_SHARED_SECRET') ?? '';

const response = await fetch(`${endpoint}/generate-daily-games`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${cronSharedSecret}`,
    'x-cron-secret': cronSharedSecret,
  },
});

const body = await response.text();

console.log(body);
