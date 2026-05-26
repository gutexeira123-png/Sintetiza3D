/**
 * Supabase Client e CRUD Operations
 *
 * Fornece uma camada de abstração para todas as operações com banco de dados.
 * Suporta cache com localStorage e fallback se Supabase indisponível.
 */

// Importar Supabase SDK (via module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.0/+esm';

// Configuração
const SUPABASE_URL = window.SUPABASE_CONFIG?.url || '';
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.anonKey || '';

// Criar cliente (será null se credenciais inválidas)
let supabaseClient = null;

try {
  if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('sua-id-projeto')) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase cliente inicializado com sucesso');
  } else {
    console.warn('⚠️  Supabase não configurado. Usando dados locais.');
  }
} catch (error) {
  console.error('❌ Erro ao inicializar Supabase:', error);
}

// Cache em localStorage
const CACHE_KEY = 'financas-pro-transactions-cache';
const CACHE_TIMESTAMP = 'financas-pro-cache-time';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obter transações do Supabase ou cache
 */
export async function getTransactions(options = {}) {
  const { forceRefresh = false } = options;

  // Verificar cache
  if (!forceRefresh && !isCacheExpired()) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      console.log('📦 Usando transações do cache local');
      return JSON.parse(cached);
    }
  }

  // Se Supabase não está configurado, retornar cache ou array vazio
  if (!supabaseClient) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      console.log('⚠️  Supabase indisponível, usando cache');
      return JSON.parse(cached);
    }
    console.log('⚠️  Sem dados em cache, retornando array vazio');
    return [];
  }

  try {
    // Obter user_id atual
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userId = session?.user?.id;

    // Buscar do Supabase - filtrar por user_id se existir
    let query = supabaseClient
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao buscar transações:', error);
      // Fallback para cache
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }

    // Atualizar cache
    localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
    localStorage.setItem(CACHE_TIMESTAMP, Date.now().toString());

    console.log(`✅ ${data?.length || 0} transações carregadas do Supabase`);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao conectar com Supabase:', error);
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : [];
  }
}

/**
 * Criar nova transação
 */
export async function createTransaction(txData) {
  if (!supabaseClient) {
    console.warn('⚠️  Supabase não configurado. Transação não será salva.');
    return { error: 'Supabase não configurado' };
  }

  try {
    // Obter user_id atual
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userId = session?.user?.id || null;

    const { data, error } = await supabaseClient
      .from('transactions')
      .insert([{
        type: txData.type,
        description: txData.description,
        amount: txData.amount,
        category: txData.category || null,
        date: txData.date,
        note: txData.note || null,
        user_id: userId
      }])
      .select();

    if (error) {
      console.error('❌ Erro ao criar transação:', error);
      return { error: error.message };
    }

    // Limpar cache para forçar refresh
    clearCache();
    console.log('✅ Transação criada com sucesso:', data?.[0]);
    return { data: data?.[0] };
  } catch (error) {
    console.error('❌ Erro ao criar transação:', error);
    return { error: error.message };
  }
}

/**
 * Deletar transação
 */
export async function deleteTransaction(transactionId) {
  if (!supabaseClient) {
    console.warn('⚠️  Supabase não configurado. Transação não será deletada.');
    return { error: 'Supabase não configurado' };
  }

  try {
    const { error } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', transactionId);

    if (error) {
      console.error('❌ Erro ao deletar transação:', error);
      return { error: error.message };
    }

    // Limpar cache
    clearCache();
    console.log('✅ Transação deletada com sucesso');
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ Erro ao deletar transação:', error);
    return { error: error.message };
  }
}

/**
 * Atualizar transação (preparado para uso futuro)
 */
export async function updateTransaction(transactionId, updates) {
  if (!supabaseClient) {
    console.warn('⚠️  Supabase não configurado. Transação não será atualizada.');
    return { error: 'Supabase não configurado' };
  }

  try {
    const { data, error } = await supabaseClient
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .select();

    if (error) {
      console.error('❌ Erro ao atualizar transação:', error);
      return { error: error.message };
    }

    clearCache();
    console.log('✅ Transação atualizada com sucesso');
    return { data: data?.[0], error: null };
  } catch (error) {
    console.error('❌ Erro ao atualizar transação:', error);
    return { error: error.message };
  }
}

/**
 * Verificar se cache expirou
 */
function isCacheExpired() {
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP);
  if (!timestamp) return true;
  return Date.now() - parseInt(timestamp) > CACHE_DURATION;
}

/**
 * Limpar cache
 */
export function clearCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_TIMESTAMP);
}

/**
 * Verificar status da conexão
 */
export function isSupabaseConfigured() {
  return supabaseClient !== null;
}

/**
 * Obter status da conexão
 */
export function getSupabaseStatus() {
  return {
    configured: supabaseClient !== null,
    url: supabaseClient ? 'Configurado' : 'Não configurado',
    hasCache: !!localStorage.getItem(CACHE_KEY),
    cacheExpired: isCacheExpired()
  };
}

/**
 * Obter sessão atual do usuário
 */
export async function getSession() {
  if (!supabaseClient) return null;
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session;
}

/**
 * Fazer logout
 */
export async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
}

/**
 * Retorna o cliente Supabase para uso externo (auth listener)
 */
export function getSupabaseClient() {
  return supabaseClient;
}
