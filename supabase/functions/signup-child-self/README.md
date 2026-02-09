# signup-child-self

Edge Function pour l'inscription autonome d'un élève (sans parent connecté).

Utilise l'Admin API Supabase pour créer l'utilisateur, ce qui permet de mieux gérer les erreurs et contourner les problèmes potentiels avec le trigger `handle_new_user`.

## Déploiement

```bash
supabase functions deploy signup-child-self
```

## Variables d'environnement

Utilise automatiquement `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` (configurés sur le projet).
