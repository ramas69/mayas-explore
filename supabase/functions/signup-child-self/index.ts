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

    // Utiliser le client Anon pour que Supabase envoie l'email de confirmation (template Enfant)
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!anonKey) {
      console.error('SUPABASE_ANON_KEY manquant !');
      throw new Error('Configuration serveur incomplète (ANON_KEY).');
    }
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    console.log('[signup-child-self] Tentative signUp pour:', emailTrimmed);

    const { data, error } = await supabaseAnon.auth.signUp({
      email: emailTrimmed,
      password,
      options: {
        data: {
          role: 'enfant',
          full_name: fullName.trim(),
          parent_id: parentId,
          parent_email: parentId ? null : parentEmailTrimmed,
          is_approved: false,
          ...(classeValue && { classe: classeValue }),
        },
      },
    });

    if (error) {
      console.error('[signup-child-self] Erreur signUp:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data?.user) {
      console.error('[signup-child-self] Pas de user retourné.');
      return new Response(
        JSON.stringify({ error: 'La création du compte a échoué (pas de données).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[signup-child-self] User créé:', data.user.id);

    // Persister explicitement parent_email dans profiles via UPSERT pour garantir la donnée
    const profileData = {
      id: data.user.id,
      email: emailTrimmed,
      role: 'enfant',
      parent_id: parentId,
      parent_email: parentId ? null : parentEmailTrimmed, // C'est ici que l'email est sauvegardé
      full_name: fullName.trim(),
      is_approved: false,
      ...(classeValue && { classe: classeValue }),
      updated_at: new Date().toISOString(),
    };

    console.log('[signup-child-self] Upsert profil:', profileData);

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert(profileData); // Upsert remplace le trigger si besoin

    if (profileErr) {
      console.error('[signup-child-self] Erreur upsert profil:', profileErr);
      // On ne bloque pas pour autant, l'user est créé
    } else {
      console.log('[signup-child-self] Profil mis à jour avec succès.');
    }

    // --- INVITATION PARENT (SUPABASE AUTH) ---
    // Si le parent n'existe pas, on l'invite automatiquement
    if (!parentId) {
      console.log('[signup-child-self] Envoi invitation parent à:', parentEmailTrimmed);
      const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(parentEmailTrimmed, {
        data: {
          role: 'parent',
          full_name: 'Parent',
        },
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://maya-explorer.com'}/auth?mode=login&role=parent`,
      });

      if (inviteErr) {
        console.error('[signup-child-self] Erreur invitation parent:', inviteErr);
      } else {
        console.log('[signup-child-self] Invitation envoyée.');
      }
    } else {
      console.log('[signup-child-self] Parent existe déjà (id: ' + parentId + '), pas d\'invitation.');
    }
    // ---------------------------------------

    return new Response(
      JSON.stringify({ success: true, user: { id: data.user.id } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[signup-child-self] Exception:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Erreur serveur critique' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
