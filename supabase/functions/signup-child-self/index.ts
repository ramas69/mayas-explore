/**
 * Edge Function: signup-child-self
 * Inscription élève autonome (sans parent connecté).
 * Utilise l'Admin API pour créer l'utilisateur et mieux gérer les erreurs.
 * Ne nécessite pas d'authentification.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { email, password, fullName, parentEmail, classe } = await req.json();

    if (!email || !password || !fullName || !parentEmail) {
      return new Response(
        JSON.stringify({ error: 'Email, mot de passe, nom et email du parent requis.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailTrimmed = email.trim().toLowerCase();
    const parentEmailTrimmed = parentEmail.trim().toLowerCase();

    if (emailTrimmed === parentEmailTrimmed) {
      return new Response(
        JSON.stringify({ error: "L'email de l'élève doit être différent de celui du parent." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si le parent existe (utilise service role, bypass RLS)
    const { data: parent } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', parentEmailTrimmed)
      .eq('role', 'parent')
      .maybeSingle();

    const parentId = parent?.id ?? null;
    const validClasses = ['6ème', '5ème', '4ème', '3ème'];
    const classeValue = classe && validClasses.includes(classe) ? classe : undefined;

    const { data, error } = await supabase.auth.admin.createUser({
      email: emailTrimmed,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'enfant',
        full_name: fullName.trim(),
        parent_id: parentId,
        parent_email: parentId ? null : parentEmailTrimmed,
        is_approved: false,
        ...(classeValue && { classe: classeValue }),
      },
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data?.user) {
      return new Response(
        JSON.stringify({ error: 'La création du compte a échoué. Réessaie.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user: { id: data.user.id } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[signup-child-self]', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Erreur serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
