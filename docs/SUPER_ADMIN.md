# Super Admin

Le Super Admin a un accès complet à la plateforme : il voit tout, configure tout, et peut gérer les sources de scraping du programme collège.

## Créer un compte Super Admin

1. **Inscris-toi** normalement sur la plateforme (par exemple en tant que parent)
2. **Promouvoir le compte** en exécutant dans Supabase SQL Editor :

```sql
UPDATE public.profiles
SET role = 'super_admin', updated_at = NOW()
WHERE email = 'ton-email@example.com';
```

Remplace `ton-email@example.com` par ton email.

## Accès

- URL : `/admin`
- Après connexion, les comptes avec `role = 'super_admin'` sont redirigés automatiquement vers `/admin`

## Fonctionnalités

- **Vue d'ensemble** : statistiques (parents, enfants, programmes)
- **Sources** : gérer les URLs et APIs pour le scraping
- **Scraping du programme** : lancer l'import via **Perplexity** → `programme_college_global`

## Configuration Perplexity

Le scraping du programme utilise l'API Perplexity. Configure la clé API :

1. Va sur [perplexity.ai/account/api](https://perplexity.ai/account/api) pour créer une clé
2. Dans Supabase : **Edge Functions** → **Secrets** → ajoute `PERPLEXITY_API_KEY`
3. Ou via CLI : `supabase secrets set PERPLEXITY_API_KEY=pplx-xxx`

## Tables créées

- `admin_sources` : sources configurées (URLs, APIs)
- `programme_college_global` : programme officiel scrapé, partagé par classe (6ème, 5ème, 4ème, 3ème)

## Migrations

```bash
supabase db push
```
