/**
 * Supabase Configuration
 *
 * IMPORTANTE: Substitua os valores abaixo com suas credenciais do Supabase:
 * 1. VITE_SUPABASE_URL - Seu URL do projeto (exemplo: https://xyzabc.supabase.co)
 * 2. VITE_SUPABASE_ANON_KEY - Sua chave anônima pública (começar com eyJ...)
 *
 * Essas credenciais podem ser encontradas em:
 * - Supabase Dashboard → Settings → API
 *
 * NUNCA use a service role key aqui - apenas a chave pública anônima!
 */

const SUPABASE_URL = 'https://pfopispdavypilzjvpwk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AHEam_M858wA60-tG58kCA_iW8L_kPI';

// Validação
if (!SUPABASE_URL || SUPABASE_URL.includes('sua-id-projeto')) {
  console.warn('⚠️  Supabase URL não está configurada. Configure em supabase-config.js');
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('sua-chave')) {
  console.warn('⚠️  Supabase ANON_KEY não está configurada. Configure em supabase-config.js');
}

// Exportar para uso em app.js
window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};
