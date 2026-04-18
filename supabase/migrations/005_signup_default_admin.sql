-- New auth users get Admin by default (single-tenant / bootstrap friendly).
-- Change back to 'Viewer' here if you open public self-serve sign-up in production.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, role, can_view_prices)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Admin'),
        CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'Admin') = 'Admin' THEN true ELSE false END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
