-- ==================================================
-- WebSecurity Supabase Database Setup
-- Copy and paste these queries into Supabase SQL Editor
-- Run them in order (one at a time recommended)
-- ==================================================

-- 1. CREATE PROFILES TABLE
-- ==================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);

-- 2. ENABLE ROW LEVEL SECURITY
-- ==================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" ON public.profiles
    FOR DELETE USING (auth.uid() = id);

-- 3. CREATE USER REGISTRATION TRIGGER
-- ==================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, full_name)
    VALUES (
        new.id,
        COALESCE(
            new.raw_user_meta_data->>'username',
            new.raw_user_meta_data->>'full_name',
            split_part(new.email, '@', 1)
        ),
        new.email,
        new.raw_user_meta_data->>'full_name'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. CREATE UPDATED_AT TRIGGER
-- ==================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. CREATE HELPER FUNCTIONS
-- ==================================================
CREATE OR REPLACE FUNCTION public.is_username_available(username_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE username = username_input
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_profile_by_username(username_input TEXT)
RETURNS TABLE(
    id UUID,
    username TEXT,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.username, p.email, p.full_name, p.avatar_url, p.created_at, p.updated_at
    FROM public.profiles p
    WHERE p.username = username_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CREATE USER VIEW
-- ==================================================
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    p.id,
    p.username,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.updated_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.created_at as auth_created_at
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id;

GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- ==================================================
-- OPTIONAL: Activity Logging (Uncomment if needed)
-- ==================================================
/*
CREATE TABLE IF NOT EXISTS public.user_activity (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity" ON public.user_activity
    FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_activity_created_at_idx ON public.user_activity(created_at);
*/

-- ==================================================
-- SETUP COMPLETE!
-- Next steps:
-- 1. Go to Authentication → Settings
-- 2. Set Site URL to: http://localhost:5173
-- 3. Update your .env files with Supabase credentials
-- 4. Start your application servers
-- ==================================================