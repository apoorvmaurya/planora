-- Add history JSONB column to itinerary_items for tracking edits and resuggestions
ALTER TABLE public.itinerary_items ADD COLUMN history jsonb DEFAULT '[]'::jsonb;
