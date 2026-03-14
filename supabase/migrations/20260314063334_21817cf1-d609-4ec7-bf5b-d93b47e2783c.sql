
INSERT INTO public.profiles (id, email, role, full_name)
VALUES ('08ca13b7-9242-44e4-a78b-d77c85e9f276', 'felipedecgomes@outlook.com', 'superadmin', 'Felipe')
ON CONFLICT (id) DO UPDATE SET role = 'superadmin', full_name = 'Felipe';
