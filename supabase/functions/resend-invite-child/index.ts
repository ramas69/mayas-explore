// Edge Function: resend-invite-child
// Envoie un email à l'enfant avec un lien magique pour créer ou réinitialiser son mot de passe.
// Nécessite RESEND_API_KEY dans les secrets Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildEmailHtml(link: string, isRecovery: boolean): string {
  const title = isRecovery
    ? 'Réinitialisation de ton mot de passe Maya Explorer'
    : 'Invitation à rejoindre Maya Explorer';
  const cta = isRecovery ? 'Choisir un nouveau mot de passe' : 'Créer mon mot de passe';
  const description = isRecovery
    ? 'Clique sur le bouton ci-dessous pour définir un nouveau mot de passe. Tu pourras ensuite te connecter et modifier ton email si tu le souhaites.'
    : 'Clique sur le bouton ci-dessous pour créer ton mot de passe. À la première connexion, tu pourras modifier ton email si tu le souhaites.';
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;max-width:500px;margin:32px auto;padding:0 16px;">
  <h1 style="color:#1a1a1a;font-size:24px;">${title}</h1>
  <p style="color:#444;line-height:1.6;">${description}</p>
  <p style="margin:24px 0;">
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${cta}</a>
  </p>
  <p style="color:#888;font-size:12px;">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>
  <a href="${link}" style="color:#f59e0b;word-break:break-all;">${link}</a></p>
  <p style="color:#888;font-size:12px;margin-top:32px;">— L'équipe Maya Explorer</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'Maya Explorer <onboarding@resend.dev>';

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Session invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, parentId } = await req.json();

    if (!email || !parentId) {
      return new Response(
        JSON.stringify({ error: 'Email et parentId requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user.id !== parentId) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que l'enfant appartient bien à ce parent
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('parent_id', parentId)
      .eq('role', 'enfant')
      .maybeSingle();

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Enfant non trouvé ou n\'appartient pas à ce parent' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normEmail = email.toLowerCase().trim();
    let actionLink: string | null = null;
    let isRecovery = false;

    // Essayer recovery en premier (utilisateur déjà inscrit → "already been registered")
    const { data: recoveryData, error: recoveryErr } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: normEmail,
    });

    if (!recoveryErr && recoveryData?.action_link) {
      actionLink = recoveryData.action_link;
      isRecovery = true;
    } else {
      // Sinon : enfant invité mais pas encore inscrit → lien d'invitation
      const { data: inviteData, error: inviteErr } = await supabase.auth.admin.generateLink({
        type: 'invite',
        email: normEmail,
      });

      if (!inviteErr && inviteData?.action_link) {
        actionLink = inviteData.action_link;
      } else {
        const errMsg = recoveryErr?.message || inviteErr?.message || 'Utilisateur non trouvé dans l\'authentification';
        return new Response(
          JSON.stringify({ error: `Impossible de générer le lien : ${errMsg}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Service d\'envoi d\'emails non configuré (RESEND_API_KEY manquant)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Envoyer l'email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [normEmail],
        subject: isRecovery
          ? 'Maya Explorer — Réinitialisation de ton mot de passe'
          : 'Maya Explorer — Invitation à rejoindre l\'aventure',
        html: buildEmailHtml(actionLink!, isRecovery),
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      const errMsg = (resData as { message?: string })?.message || `Erreur Resend: ${res.status}`;
      return new Response(
        JSON.stringify({ error: `Impossible d'envoyer l'email : ${errMsg}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, email_sent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
