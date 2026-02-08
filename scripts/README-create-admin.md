# Créer le Super Admin (ramatoulaye.sou / Admin1234!)

## Option 1 : Script Node (recommandé)

1. Va dans **Supabase Dashboard** → ton projet → **Settings** → **API**
2. Copie la clé **service_role** (secret)
3. Exécute :

```bash
SUPABASE_SERVICE_ROLE_KEY=ta_cle node scripts/create-super-admin.mjs
```

Ou avec un email différent :
```bash
SUPABASE_SERVICE_ROLE_KEY=ta_cle SUPER_ADMIN_EMAIL=ramatoulaye.sou@gmail.com node scripts/create-super-admin.mjs
```

Email par défaut : `ramatoulaye.sou@gmail.com`  
Mot de passe : `Admin1234!`

## Option 2 : Supabase Dashboard

1. **Authentication** → **Users** → **Add user**
2. Email : `ramatoulaye.sou@gmail.com` (ou ton email)
3. Password : `Admin1234!`
4. Puis dans **SQL Editor** :

```sql
UPDATE public.profiles
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'ramatoulaye.sou@gmail.com';
```
