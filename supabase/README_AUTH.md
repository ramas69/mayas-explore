# Configuration Supabase - Authentification Parent/Élève

## Migration à exécuter

Dans le dashboard Supabase → SQL Editor, exécutez le contenu de :
`supabase/migrations/20250206000000_add_parent_email_and_auth.sql`

## Prérequis

La table `profiles` doit exister avec les colonnes :
- `id` (uuid, PK, FK vers auth.users)
- `email` (text)
- `role` ('parent' | 'enfant')
- `parent_id` (uuid, nullable)
- `parent_email` (text, nullable) — ajoutée par la migration
- `is_approved` (boolean, défaut false)
- `daily_time_limit` (int, défaut 120)
- `full_name` (text, nullable)
- `avatar_url` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

## Flux d'authentification

1. **Parent s'inscrit** : Compte créé, accès immédiat au tableau de bord.
2. **Parent crée un enfant** : Compte enfant créé avec `is_approved: true`, accès immédiat.
3. **Enfant s'inscrit seul** : Indique l'email du parent. Si le parent existe, `parent_id` est lié. Sinon, `parent_email` est stocké. Compte en attente jusqu'à validation par le parent.
4. **Parent valide** : Dans le tableau de bord, section "Demandes en attente", le parent clique "Valider".

## RLS (Row Level Security)

Exemples de politiques à configurer sur `profiles` :

- Un parent peut lire/valider ses enfants : `parent_id = auth.uid() OR id = auth.uid()`
- Un enfant peut lire son propre profil : `id = auth.uid()`
- Les inserts sont gérés par le trigger `handle_new_user`
