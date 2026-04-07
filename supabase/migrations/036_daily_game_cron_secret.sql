create schema if not exists extensions;
create extension if not exists pg_net schema extensions;

do $$
declare
  v_pg_net_schema text;
begin
  select extnamespace::regnamespace::text
    into v_pg_net_schema
  from pg_extension
  where extname = 'pg_net';

  if v_pg_net_schema is null then
    raise exception 'pg_net extension is required for daily game cron jobs';
  end if;

  if exists (select 1 from cron.job where jobname = 'generate-daily-games') then
    perform cron.unschedule('generate-daily-games');
  end if;

  if exists (select 1 from cron.job where jobname = 'reveal-daily-question') then
    perform cron.unschedule('reveal-daily-question');
  end if;

  perform cron.schedule(
    'generate-daily-games',
    '0 3 * * *',
    format(
      $sql$select %I.http_post(
        url := current_setting('app.edge_function_url') || '/generate-daily-games',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.cron_shared_secret'),
          'x-cron-secret', current_setting('app.cron_shared_secret'),
          'Content-Type', 'application/json'
        )
      )$sql$,
      v_pg_net_schema
    )
  );

  perform cron.schedule(
    'reveal-daily-question',
    '0 17 * * *',
    format(
      $sql$select %I.http_post(
        url := current_setting('app.edge_function_url') || '/generate-daily-games/reveal',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.cron_shared_secret'),
          'x-cron-secret', current_setting('app.cron_shared_secret'),
          'Content-Type', 'application/json'
        )
      )$sql$,
      v_pg_net_schema
    )
  );
end;
$$;
