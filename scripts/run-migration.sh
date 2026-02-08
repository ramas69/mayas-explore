#!/bin/bash
# Exécuter la migration Supabase - authentification parent/élève
# Prérequis: supabase login (une fois)

cd "$(dirname "$0")/.."
echo "🔗 Liaison au projet Supabase..."
supabase link --project-ref khhkbhyaxdewytqknics
echo ""
echo "📤 Push des migrations..."
supabase db push
echo ""
echo "✅ Migration exécutée."
