/**
 * Supabase Configuration
 *
 * SEGURANÇA:
 * - A chave anônima (ANON_KEY) é feita para ser usada no front-end
 * - NUNCA use a service_role key aqui - apenas a chave pública anônima!
 * - As Row Level Security (RLS) policies no Supabase são a ÚNICA proteção real dos dados
 * - Se RLS não estiver configurada, qualquer pessoa com essa chave pode ler/escrever no banco
 *
 * Configure RLS no Supabase Dashboard → Authentication → Policies
 */

const SUPABASE_URL = 'https://pfopispdavypilzjvpwk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AHEam_M858wA60-tG58kCA_iW8L_kPI';

if (!SUPABASE_URL || SUPABASE_URL.includes('sua-id-projeto')) {
  console.warn('⚠️  Supabase URL não está configurada. Configure em supabase-config.js');
}
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('sua-chave')) {
  console.warn('⚠️  Supabase ANON_KEY não está configurada. Configure em supabase-config.js');
}

window.SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY
};
