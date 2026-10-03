-- Give one existing account the admin role.
-- 1. Create the user first (Supabase Auth → "Add user", or `supabase auth` CLI) with a strong password.
-- 2. Replace the email below and run this file.
-- Public sign-up should stay DISABLED: readers never need an account.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'admin@example.org'
ON CONFLICT (user_id, role) DO NOTHING;
