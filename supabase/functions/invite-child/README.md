# Edge Function: invite-child

Permet au parent d'inviter un enfant par email. L'enfant reçoit un email Supabase et choisit son propre mot de passe.

## Déploiement

```bash
supabase functions deploy invite-child
```

## Activation

1. Dans Supabase Dashboard → Authentication → Providers, activer "Email" pour les invitations
2. Configurer le template d'email d'invitation si besoin (Settings → Auth → Email Templates)

## Flux

1. Parent appelle la fonction avec `{ email, fullName, parentId }`
2. La fonction vérifie que l'appelant est le parent (auth token)
3. `auth.admin.inviteUserByEmail` envoie un email à l'enfant
4. L'enfant clique sur le lien et définit son mot de passe
5. Le parent conserve accès aux données de l'enfant
