-- Read-only checks after applying the migration to the chosen project.
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'kotak_private' and c.relkind = 'r' order by c.relname;
select
  has_function_privilege('anon','public.kotak_start_trial(uuid)','EXECUTE') as anon_may_start_trial,
  has_function_privilege('authenticated','public.kotak_start_trial(uuid)','EXECUTE') as client_may_start_trial,
  has_function_privilege('service_role','public.kotak_start_trial(uuid)','EXECUTE') as server_may_start_trial;
select count(*) as trial_records from kotak_private.trials;
