-- Permettre aux parents de lire et mettre à jour les profils enfants en attente (parent_email = email du parent)
-- Problème: un parent ne peut pas voir les demandes d'inscription tant que parent_id n'est pas set (RLS bloque)
-- Solution: policies pour SELECT et UPDATE sur profiles où parent_email correspond à l'email du parent connecté

-- Fonction helper : email de l'utilisateur connecté (auth.users, pas profiles → évite récursion)
CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- Lecture : le parent peut voir les profils enfants où parent_email = son email
CREATE POLICY "Parents can read pending children by parent_email"
  ON public.profiles FOR SELECT
  USING (
    role = 'enfant'
    AND parent_email IS NOT NULL
    AND LOWER(TRIM(parent_email)) = LOWER(TRIM(public.auth_user_email()))
  );

-- Mise à jour : le parent peut lier ces enfants (set parent_id, clear parent_email)
CREATE POLICY "Parents can update pending children by parent_email"
  ON public.profiles FOR UPDATE
  USING (
    role = 'enfant'
    AND parent_email IS NOT NULL
    AND LOWER(TRIM(parent_email)) = LOWER(TRIM(public.auth_user_email()))
  );
