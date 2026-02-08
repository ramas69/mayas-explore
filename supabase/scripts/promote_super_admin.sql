-- Promouvoir un utilisateur en super_admin
-- Remplace TON_EMAIL par l'email du compte à promouvoir

-- Exemple : UPDATE public.profiles SET role = 'super_admin' WHERE email = 'admin@example.com';

UPDATE public.profiles
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'TON_EMAIL';
