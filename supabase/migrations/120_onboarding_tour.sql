-- Migration 120: Onboarding tour completion status
-- Step 15: Interactive onboarding tour persistence

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tour_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.tour_completed IS 'Flag indicating whether the user completed the interactive onboarding tour';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Flag indicating whether the user completed onboarding';
