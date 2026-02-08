#!/usr/bin/env node
/**
 * Crée le compte super admin ramatoulaye.sou avec mot de passe Admin1234!
 * Usage: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/create-super-admin.mjs
 * Ou: npx supabase run scripts/create-super-admin.mjs (avec .env)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://khhkbhyaxdewytqknics.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('ERREUR: Définis SUPABASE_SERVICE_ROLE_KEY (trouvable dans Supabase Dashboard → Settings → API)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const EMAIL = process.env.SUPER_ADMIN_EMAIL || 'ramatoulaye.sou@gmail.com';
const PASSWORD = 'Admin1234!';

async function main() {
  console.log('Création du super admin...');

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

  let userId;

  if (existing) {
    console.log('Utilisateur existant trouvé, mise à jour du mot de passe et du rôle...');
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, { password: PASSWORD });
  } else {
    console.log('Création du nouvel utilisateur...');
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'super_admin', full_name: 'Super Admin' },
    });
    if (createError) {
      console.error('Erreur création:', createError.message);
      process.exit(1);
    }
    userId = newUser.user.id;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'super_admin', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) {
    console.error('Erreur profil:', profileError.message);
    process.exit(1);
  }

  console.log('✅ Super admin créé !');
  console.log('   Email:', EMAIL);
  console.log('   Mot de passe: Admin1234!');
  console.log('   URL: /admin');
}

main();
