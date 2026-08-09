-- Apply this to the server PostgreSQL database
ALTER TABLE public.maintenance
ADD COLUMN IF NOT EXISTS status varchar(30) DEFAULT 'scheduled';

UPDATE public.maintenance
SET status = 'completed'
WHERE COALESCE(status, '') = '' AND completed_at IS NOT NULL;

UPDATE public.maintenance
SET status = 'scheduled'
WHERE COALESCE(status, '') = '';
