-- AudioBook Organizer - Supabase Database Schema
-- Run this in your Supabase SQL editor to set up the required tables

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- Create custom profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    credits INTEGER DEFAULT 100 CHECK (credits >= 0),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage logs table for tracking API usage
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    credits_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit transactions table for payment tracking
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'bonus', 'refund', 'usage')),
    credits_amount INTEGER NOT NULL,
    payment_method TEXT,
    payment_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audiobook projects table
CREATE TABLE IF NOT EXISTS public.audiobook_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
    settings JSONB DEFAULT '{}',
    chapters JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file uploads table
CREATE TABLE IF NOT EXISTS public.file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    project_id UUID REFERENCES public.audiobook_projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiobook_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Create Row Level Security policies

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- User credits policies
CREATE POLICY "Users can view own credits" 
ON public.user_credits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" 
ON public.user_credits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" 
ON public.user_credits FOR UPDATE 
USING (auth.uid() = user_id);

-- Usage logs policies
CREATE POLICY "Users can view own usage logs" 
ON public.usage_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs" 
ON public.usage_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Credit transactions policies
CREATE POLICY "Users can view own transactions" 
ON public.credit_transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" 
ON public.credit_transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Audiobook projects policies
CREATE POLICY "Users can view own projects" 
ON public.audiobook_projects FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" 
ON public.audiobook_projects FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
ON public.audiobook_projects FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
ON public.audiobook_projects FOR DELETE 
USING (auth.uid() = user_id);

-- File uploads policies
CREATE POLICY "Users can view own uploads" 
ON public.file_uploads FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads" 
ON public.file_uploads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads" 
ON public.file_uploads FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads" 
ON public.file_uploads FOR DELETE 
USING (auth.uid() = user_id);

-- Create functions and triggers

-- Function to automatically create user profile and credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (NEW.id, 100);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user function on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER audiobook_projects_updated_at
    BEFORE UPDATE ON public.audiobook_projects
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Function to update credits last_updated timestamp
CREATE OR REPLACE FUNCTION public.handle_credits_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_credits_updated
    BEFORE UPDATE ON public.user_credits
    FOR EACH ROW EXECUTE PROCEDURE public.handle_credits_updated();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON public.usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON public.usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status ON public.credit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_audiobook_projects_user_id ON public.audiobook_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_audiobook_projects_status ON public.audiobook_projects(status);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_project_id ON public.file_uploads(project_id);

-- Create views for easier data access

-- User stats view
CREATE OR REPLACE VIEW public.user_stats AS
SELECT 
    p.id,
    p.email,
    p.full_name,
    uc.credits,
    COUNT(ap.id) as total_projects,
    COUNT(CASE WHEN ap.status = 'completed' THEN 1 END) as completed_projects,
    COALESCE(SUM(ul.credits_used), 0) as total_credits_used,
    p.created_at as user_since
FROM public.profiles p
LEFT JOIN public.user_credits uc ON p.id = uc.user_id
LEFT JOIN public.audiobook_projects ap ON p.id = ap.user_id
LEFT JOIN public.usage_logs ul ON p.id = ul.user_id
GROUP BY p.id, p.email, p.full_name, uc.credits, p.created_at;

-- Recent activity view
CREATE OR REPLACE VIEW public.recent_activity AS
SELECT 
    ul.user_id,
    ul.action,
    ul.credits_used,
    ul.metadata,
    ul.created_at,
    p.email,
    p.full_name
FROM public.usage_logs ul
JOIN public.profiles p ON ul.user_id = p.id
ORDER BY ul.created_at DESC;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to service role (for server-side operations)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON TABLE public.profiles IS 'User profile information';
COMMENT ON TABLE public.user_credits IS 'User credit balances for API usage';
COMMENT ON TABLE public.usage_logs IS 'Log of API usage and credit consumption';
COMMENT ON TABLE public.credit_transactions IS 'Credit purchase and transaction history';
COMMENT ON TABLE public.audiobook_projects IS 'User audiobook projects and their settings';
COMMENT ON TABLE public.file_uploads IS 'Tracking of uploaded files and their processing status'; 