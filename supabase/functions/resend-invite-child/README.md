# Edge Function: resend-invite-child

Envoie un email à l'enfant avec un lien magique pour créer ou réinitialiser son mot de passe.
L'enfant reçoit l'email directement (plus besoin de copier le lien manuellement).

## Secrets requis

Dans Supabase Dashboard → Project Settings → Edge Functions → Secrets :

- **RESEND_API_KEY** (obligatoire) : clé API Resend (https://resend.com/api-keys)
- **EMAIL_FROM** (optionnel) : ex. `Maya Explorer <noreply@votredomaine.com>` — par défaut `onboarding@resend.dev` (limité aux tests)

Pour la production : vérifier un domaine dans Resend (https://resend.com/domains) et définir EMAIL_FROM.

## Déploiement

```bash
supabase functions deploy resend-invite-child --no-verify-jwt
```

`--no-verify-jwt` évite le rejet "Invalid JWT" au gateway. La fonction valide quand même le token en interne via `supabase.auth.getUser()`.

## Flux

1. Le parent clique sur "Renvoyer l'invitation" pour un enfant
2. La fonction vérifie que l'enfant appartient au parent
3. Génère un lien (invite si pas encore inscrit, recovery si déjà inscrit)
4. Envoie un email à l'enfant via Resend avec le lien
5. L'enfant clique sur le lien, crée ou réinitialise son mot de passe
6. À la première connexion, l'enfant peut modifier son email dans son profil
