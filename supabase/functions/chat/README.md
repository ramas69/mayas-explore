# Edge Function: chat

Mentor IA avec outil pour récupérer le programme officiel de l'Éducation nationale.

## Configuration

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

## Comportement

- Appelle OpenAI (gpt-4o-mini) avec **function calling**.
- Tool `get_programme_officiel` : quand l'élève demande « charge mon programme », « va chercher le programme », etc., l'IA appelle cet outil qui récupère les données depuis `data.education.gouv.fr`.
- L'IA reformule le programme de façon pédagogique et dans le ton « exploratrice » Maya.

## Corps de la requête

- `message` (string) : message de l'élève
- `history` (array) : dernier historique de messages
- `systemPrompt` (string) : prompt système du mentor
- `studentId` (string) : ID de l'élève
- `classe` (string | null) : classe (6ème, 5ème, 4ème, 3ème) pour cibler Cycle 3 ou Cycle 4
