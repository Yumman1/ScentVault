-- Atomically rename an olfactive note in the lookup table and on all perfumes (TEXT[]).

CREATE OR REPLACE FUNCTION public.rename_olfactive_note(old_name text, new_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  trimmed text := trim(new_name);
BEGIN
  IF old_name IS NULL OR trim(old_name) = '' THEN
    RAISE EXCEPTION 'invalid old name';
  END IF;
  IF trimmed = '' THEN
    RAISE EXCEPTION 'invalid new name';
  END IF;

  UPDATE public.olfactive_notes SET name = trimmed WHERE name = old_name;

  UPDATE public.perfumes
  SET olfactive_notes = array_replace(olfactive_notes, old_name, trimmed)
  WHERE olfactive_notes @> ARRAY[old_name]::text[];
END;
$$;

GRANT EXECUTE ON FUNCTION public.rename_olfactive_note(text, text) TO authenticated;
