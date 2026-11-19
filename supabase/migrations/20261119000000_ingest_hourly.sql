-- Start the ingest every hour instead of every 6 (runs take about 4 minutes; Actions minutes are free on this public repo).
select cron.alter_job((select jobid from cron.job where jobname = 'ingest-jobs'), schedule := '17 * * * *');
