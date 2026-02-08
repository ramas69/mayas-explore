# Edge Function: analyze-bulletin

Analyse les bulletins de notes avec OpenAI (GPT-4o Vision). Images: URL directe. PDF: base64 (pas unpdf, incompatible Deno Edge).

## Déploiement

1. **Configurer la clé OpenAI** (obligatoire) :
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

2. **Déployer la fonction** :
```bash
supabase functions deploy analyze-bulletin
```

## Support

- **Images** (PNG, JPG, JPEG) : analyse directe via GPT-4 Vision
- **PDF** : extraction du texte (unpdf) puis analyse via GPT-4o. Pour les bulletins scannés (images dans PDF), uploade une image PNG/JPG.
