-- The site assistant chat counts against the same AI allowance as the other tools.
alter table public.ai_usage drop constraint ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check check (
  feature in ('tailor', 'cover_letter', 'interview_question', 'interview_feedback', 'job_match', 'job_question', 'assistant')
);
