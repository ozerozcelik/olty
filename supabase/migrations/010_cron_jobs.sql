select cron.schedule('generate-daily-games', '0 3 * * *',
  $$select net.http_post(
    url := current_setting('app.edge_function_url') || '/generate-daily-games',
    headers := ('{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}')::jsonb
  )$$
);

select cron.schedule('reveal-daily-question', '0 17 * * *',
  $$select net.http_post(
    url := current_setting('app.edge_function_url') || '/generate-daily-games/reveal',
    headers := ('{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}')::jsonb
  )$$
);
