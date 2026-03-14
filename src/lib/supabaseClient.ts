import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string, fallback: string) => {
  const value = import.meta.env[key];
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL', 'https://odajthnbbzvntvojmmkt.supabase.co');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY', '');

if (!supabaseKey || !supabaseKey.startsWith('eyJ')) {
  console.warn('AVISO: A VITE_SUPABASE_ANON_KEY não foi configurada ou parece inválida. Certifique-se de usar a "anon public key" do Supabase (que começa com "eyJ").');
}

export const supabase = createClient(supabaseUrl, supabaseKey || 'placeholder-key');
