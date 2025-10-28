-- Insert default video categories
INSERT INTO public.video_categories (name, description) VALUES
  ('编程基础', '编程语言和基础概念'),
  ('Web开发', '前端和后端Web开发技术'),
  ('数据科学', '数据分析和机器学习'),
  ('移动开发', 'iOS和Android应用开发'),
  ('系统设计', '软件架构和系统设计')
ON CONFLICT DO NOTHING;

-- Adding initial owner account for first login
-- Create initial owner account
-- Note: This creates a user in auth.users and a corresponding profile
-- Default credentials: owner@ecampus.com / ChangeMe123!
-- IMPORTANT: Change this password after first login!

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud,
  confirmation_token,
  email_change_token_new,
  recovery_token
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'owner@ecampus.com',
  crypt('ChangeMe123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Create profile for the owner
INSERT INTO public.user_profiles (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'owner@ecampus.com'),
  'owner@ecampus.com',
  '系统管理员',
  'owner',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;
