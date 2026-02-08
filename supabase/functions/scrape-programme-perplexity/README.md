# scrape-programme-perplexity

Edge Function qui récupère le programme collège (cycles 3 et 4) via l'API Perplexity.

Remplace l'ancienne source API Éducation nationale.

## Configuration

### 1. Clé Perplexity

```bash
supabase secrets set PERPLEXITY_API_KEY=pplx-xxx
```

### 2. Erreur "Invalid JWT"

Pour éviter l'erreur JWT en production, déploie avec :

```bash
supabase functions deploy scrape-programme-perplexity --no-verify-jwt
```

La config locale (`config.toml`) a déjà `verify_jwt = false` pour cette fonction.

## Appel

```ts
const { data, error } = await supabase.functions.invoke('scrape-programme-perplexity', {
  body: { cycles: ['Cycle 3', 'Cycle 4'], classe: '6ème' },
});
// data.chapters = [{ classe, subject, chapter_name, description }, ...]
```
