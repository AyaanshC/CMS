-- An unconfigured local/staging environment must keep queued mail without
-- repeatedly submitting an invalid request to the network queue.
select cron.schedule('deliver-alerts','*/15 * * * *',$job$
 select net.http_post(
   url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url')||'/functions/v1/deliver-alerts',
   headers:=jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key'),'Content-Type','application/json'),
   body:='{}'::jsonb)
 where exists(select 1 from vault.decrypted_secrets where name='project_url' and length(decrypted_secret)>0)
   and exists(select 1 from vault.decrypted_secrets where name='service_role_key' and length(decrypted_secret)>0)
$job$);
