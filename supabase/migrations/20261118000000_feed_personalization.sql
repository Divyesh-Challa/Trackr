-- Personalized feed: tag each job with the skills it asks for, compare them with the skills on
-- the viewer's own resume, and rank jobs matching the viewer's target roles and provinces higher.
-- One dictionary, in SQL, so jobs and resumes are tagged the same way.

create table public.skill_terms (
  skill text primary key,
  pattern text not null  -- case-insensitive Postgres regex; \m and \M are word boundaries
);

alter table public.skill_terms enable row level security;
create policy "skill_terms: anyone can read" on public.skill_terms for select to anon, authenticated using (true);

insert into public.skill_terms (skill, pattern) values
  -- languages
  ('Python', '\mpython\M'), ('Java', '\mjava\M(?!script)'), ('JavaScript', '\mjavascript\M|(?<!\.)\mjs\M|\mecmascript\M'),
  ('TypeScript', '\mtypescript\M|\mts\M(?=\s*[,/)])'), ('C', '(^|[\s,(/])c(?=\s*[,/)]|\s+(and|or)\s)'),
  ('C++', '(^|[^a-z0-9])c\+\+|\mcpp\M'), ('C#', '(^|[^a-z0-9])c#|\mcsharp\M'), ('Go', '\mgolang\M|\mgo\M(?=\s*[,/)])'),
  ('Rust', '\mrust\M'), ('Kotlin', '\mkotlin\M'), ('Swift', '\mswift\M(?!ly)'), ('Ruby', '\mruby\M'),
  ('PHP', '\mphp\M'), ('Scala', '\mscala\M'), ('R', '(^|[\s,(/])r(?=\s*[,/)])|\mr programming\M|\mrstudio\M'),
  ('MATLAB', '\mmatlab\M'), ('SQL', '\msql\M'), ('Bash', '\mbash\M|\mshell scripting\M'),
  ('Dart', '\mdart\M'), ('Haskell', '\mhaskell\M'), ('Elixir', '\melixir\M'), ('Perl', '\mperl\M'),
  ('Lua', '\mlua\M'), ('Julia', '\mjulia\M(?= *[,/)])'), ('Solidity', '\msolidity\M'), ('Assembly', '\massembly language\M|\mx86 assembly\M|\marm assembly\M'),
  ('Verilog', '\mverilog\M|\msystemverilog\M'), ('VHDL', '\mvhdl\M'), ('HTML', '\mhtml5?\M'), ('CSS', '\mcss3?\M'),
  -- frontend
  ('React', '\mreact(\.?js)?\M(?! to)'), ('React Native', '\mreact native\M'), ('Next.js', '\mnext\.?js\M'),
  ('Vue', '\mvue(\.?js)?\M'), ('Angular', '\mangular(js)?\M'), ('Svelte', '\msvelte(kit)?\M'),
  ('Tailwind', '\mtailwind(css)?\M'), ('Redux', '\mredux\M'), ('GraphQL', '\mgraphql\M'), ('Flutter', '\mflutter\M'),
  ('iOS', '\mios\M'), ('Android', '\mandroid\M'), ('SwiftUI', '\mswiftui\M'),
  -- backend
  ('Node.js', '\mnode(\.?js)?\M'), ('Express', '\mexpress\.?js\M'), ('Django', '\mdjango\M'), ('Flask', '\mflask\M'),
  ('FastAPI', '\mfastapi\M'), ('Spring', '\mspring ?boot\M|\mspring framework\M'), ('Rails', '\mruby on rails\M|\mrails\M'),
  ('.NET', '(^|[^a-z0-9])\.net\M|\masp\.net\M|\mdotnet\M'), ('REST APIs', '\mrest(ful)?( apis?)?\M'), ('gRPC', '\mgrpc\M'),
  ('Microservices', '\mmicroservices?\M'), ('Kafka', '\mkafka\M'), ('RabbitMQ', '\mrabbitmq\M'),
  -- data stores
  ('PostgreSQL', '\mpostgres(ql)?\M'), ('MySQL', '\mmysql\M'), ('MongoDB', '\mmongo(db)?\M'), ('Redis', '\mredis\M'),
  ('SQLite', '\msqlite\M'), ('DynamoDB', '\mdynamodb\M'), ('Elasticsearch', '\melastic ?search\M'),
  ('Snowflake', '\msnowflake\M'), ('BigQuery', '\mbigquery\M'), ('Cassandra', '\mcassandra\M'),
  -- cloud and infra
  ('AWS', '\maws\M|\mamazon web services\M'), ('GCP', '\mgcp\M|\mgoogle cloud\M'), ('Azure', '\mazure\M'),
  ('Docker', '\mdocker\M'), ('Kubernetes', '\mkubernetes\M|\mk8s\M'), ('Terraform', '\mterraform\M'),
  ('Linux', '\mlinux\M|\munix\M'), ('Git', '\mgit\M(?!hub|lab)|\mversion control\M'), ('GitHub Actions', '\mgithub actions\M'),
  ('CI/CD', '\mci ?/ ?cd\M|\mcontinuous integration\M'), ('Jenkins', '\mjenkins\M'), ('Ansible', '\mansible\M'),
  ('Serverless', '\mserverless\M|\maws lambda\M'), ('Networking', '\mtcp/ip\M|\mnetworking protocols\M'),
  -- data and ML
  ('Machine Learning', '\mmachine learning\M|\mml\M(?!s)'), ('Deep Learning', '\mdeep learning\M|\mneural networks?\M'),
  ('PyTorch', '\mpytorch\M|\mtorch\M'), ('TensorFlow', '\mtensorflow\M|\mkeras\M'), ('scikit-learn', '\mscikit-?learn\M|\msklearn\M'),
  ('Pandas', '\mpandas\M'), ('NumPy', '\mnumpy\M'), ('Spark', '\m(apache |py)?spark\M'), ('Hadoop', '\mhadoop\M'),
  ('Airflow', '\mairflow\M'), ('dbt', '\mdbt\M'), ('LLMs', '\mllms?\M|\mlarge language models?\M|\mgenerative ai\M'),
  ('NLP', '\mnlp\M|\mnatural language processing\M'), ('Computer Vision', '\mcomputer vision\M|\mopencv\M'),
  ('Statistics', '\mstatistic(s|al)\M'), ('Tableau', '\mtableau\M'), ('Power BI', '\mpower ?bi\M'),
  ('Excel', '\mmicrosoft excel\M|\mexcel\M(?! (in|at))'), ('Data Visualization', '\mdata visuali[sz]ation\M'), ('ETL', '\metl\M'),
  -- hardware and embedded
  ('Embedded C', '\membedded c\M|\mfirmware\M'), ('RTOS', '\mrtos\M|\mfreertos\M'), ('FPGA', '\mfpgas?\M'),
  ('PCB Design', '\mpcb\M|\maltium\M|\mkicad\M'), ('Microcontrollers', '\mmicrocontrollers?\M|\marduino\M|\mstm32\M|\mesp32\M'),
  ('ROS', '\mros2?\M'), ('CAD', '\msolidworks\M|\mautocad\M|\mfusion 360\M|\mcatia\M'), ('Simulink', '\msimulink\M'),
  ('LabVIEW', '\mlabview\M'), ('Robotics', '\mrobotics\M'), ('Signal Processing', '\msignal processing\M|\mdsp\M'),
  -- practices and tools
  ('Unit Testing', '\munit tests?(ing)?\M|\mjest\M|\mpytest\M|\mjunit\M'), ('Agile', '\magile\M|\mscrum\M'),
  ('Figma', '\mfigma\M'), ('Jira', '\mjira\M'), ('Selenium', '\mselenium\M|\mplaywright\M|\mcypress\M'),
  ('Security', '\mcyber ?security\M|\mpenetration testing\M|\mowasp\M'), ('Blockchain', '\mblockchain\M|\mweb3\M'),
  ('Unity', '\munity3?d?\M(?= *[,/)]|\s+engine)|\munity3d\M'), ('Unreal Engine', '\munreal( engine)?\M'),
  ('Salesforce', '\msalesforce\M'), ('SAP', '\msap\M');

create function public.extract_skills(p_text text)
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(skill order by skill), '{}')
  from public.skill_terms
  where p_text is not null and p_text ~* pattern;
$$;

grant execute on function public.extract_skills(text) to anon, authenticated;

alter table public.jobs add column skills text[] not null default '{}';

create function public.jobs_set_skills()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.skills := public.extract_skills(new.title || E'\n' || coalesce(new.description_md, ''));
  return new;
end;
$$;

create trigger jobs_set_skills
  before insert or update of title, description_md on public.jobs
  for each row execute function public.jobs_set_skills();

update public.jobs set skills = public.extract_skills(title || E'\n' || coalesce(description_md, ''));

-- The feed, now personal: match_percent is the share of a job's skills found anywhere on the
-- viewer's resume (null when either side has none); rank_score adds a bonus for the viewer's
-- target provinces and roles from their profile. Both read the viewer's rows through RLS.
drop view public.job_feed;

create view public.job_feed with (security_invoker = true) as
with me as (
  select
    (select public.extract_skills(string_agg(heading || ': ' || content, E'\n'))
       from public.resume_bullets where user_id = (select auth.uid())) as skills,
    p.target_roles, p.target_provinces
  from (select 1) one
  left join public.profiles p on p.id = (select auth.uid())
)
select
  j.*,
  t.trackers_week,
  coalesce(j.posted_at, j.first_seen_at) as posted_sort,
  exists (select 1 from public.job_hides h where h.job_id = j.id and h.user_id = (select auth.uid())) as hidden,
  m.match_percent,
  (
    greatest(0, 20 - extract(epoch from now() - coalesce(j.posted_at, j.first_seen_at)) / 86400 * (20.0 / 30))
    + case j.company_size when 'large' then 10 when 'mid' then 5 else 0 end
    + least(15, t.trackers_week * 3)
    + case when j.salary_source = 'posted' then 5 else 0 end
    - case when j.is_repost then 3 else 0 end
    + case when j.province = any(me.target_provinces) or (j.work_model = 'remote' and cardinality(me.target_provinces) > 0) then 8 else 0 end
    + case when exists (
        select 1 from unnest(me.target_roles) r
        where length(trim(r)) > 1 and (j.title ilike '%' || trim(r) || '%' or lower(trim(r)) = any(j.disciplines))
      ) then 8 else 0 end
    + coalesce(m.match_percent, 0) / 10.0
  )::real as rank_score
from public.jobs j
cross join me
cross join lateral (select public.job_trackers_week(j.id) as trackers_week) t
cross join lateral (
  select case when cardinality(j.skills) > 0 and cardinality(me.skills) > 0 then
    (100 * cardinality(array(select unnest(j.skills) intersect select unnest(me.skills))) / cardinality(j.skills))::integer
  end as match_percent
) m;

grant select on public.job_feed to anon, authenticated;
