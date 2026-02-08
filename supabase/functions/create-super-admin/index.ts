// Edge Function: create-super-admin
// Crée un utilisateur super_admin avec email et mot de passe.
// Sécurisé par CREATE_SUPER_ADMIN_SECRET (à définir dans les secrets).
// Usage: curl -X POST .../create-super-admin -H "Authorization: Bearer $SECRET" -d '{"email":"...","password":"..."}'

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
    const secret = Deno.env.get('CREATE_SUPER_ADMIN_SECRET');
    const body = await req.json();
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || body?.secret;

    if (!secret || token !== secret) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé. Définis CREATE_SUPER_ADMIN_SECRET dans les secrets.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password } = body;
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'email et password requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const emailNormalized = email.toLowerCase().trim();

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === emailNormalized);

    let userId: string;

    if (existing) {
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, { password });
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: emailNormalized,
        password,
        email_confirm: true,
        user_metadata: { role: 'super_admin', full_name: 'Super Admin' },
      });
      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = newUser.user.id;
    }

    await supabase.from('profiles').update({ role: 'super_admin', updated_at: new Date().toISOString() }).eq('id', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Super admin créé ou mis à jour.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
