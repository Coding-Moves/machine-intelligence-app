insert into public.editors (email, name, role)
values ('admin@example.com', 'Replace with the admin name', 'admin')
on conflict (email) do nothing;
