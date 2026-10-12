-- Field photos are kept inside job_updates (public storage buckets are disabled on this project),
-- so the same row-level rules that protect the job protect its photos.

ALTER TABLE public.job_updates DROP CONSTRAINT job_update_has_content;

ALTER TABLE public.job_updates ADD COLUMN photo_data text, ADD COLUMN photo_mime text;

ALTER TABLE public.job_updates ADD CONSTRAINT job_update_has_content
  CHECK (nullif(body,'') is not null or nullif(photo_data,'') is not null);
ALTER TABLE public.job_updates ADD CONSTRAINT job_update_photo_size
  CHECK (photo_data is null or char_length(photo_data) < 4000000);

COMMENT ON COLUMN public.job_updates.photo_path IS 'DEPRECATED: photos are stored inline in photo_data; public buckets are disabled on this project';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_updates TO authenticated;
GRANT ALL ON public.job_updates TO service_role;