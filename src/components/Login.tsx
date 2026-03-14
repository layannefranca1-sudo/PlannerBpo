import React, { useState } from 'react';
import { Calendar, Mail, Lock, User, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [isEmailLogin, setIsEmailLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginIdentifier = isEmailLogin ? email : `${userCode.toLowerCase()}@planner.com`;
      
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginIdentifier,
        password: password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          setError('E-mail não confirmado. Por favor, desative a opção "Confirm Email" nas configurações de Autenticação do seu painel Supabase.');
          return;
        }
        if (authError.message.toLowerCase().includes('failed to fetch')) {
          setError('Erro de conexão: Não foi possível alcançar o servidor do Supabase. Verifique sua conexão ou se a URL do Supabase está correta.');
          return;
        }
        if (authError.message.toLowerCase().includes('api key')) {
          setError('Chave de API Inválida: A chave configurada não é válida para o Supabase. Verifique se você copiou a "anon public key" corretamente no painel do Supabase.');
          return;
        }
        throw authError;
      }

      if (data.user) {
        // Fetch user profile/role from a custom table if needed, 
        // or use user metadata
        const user = {
          id: data.user.id,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
          email: data.user.email,
          role: data.user.user_metadata?.role || (isEmailLogin ? 'ADMIN' : 'USER'),
          user_code: userCode
        };
        onLogin(user);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(`Erro ao fazer login: ${err instanceof Error ? err.message : 'Credenciais inválidas'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAdmin = async () => {
    setLoading(true);
    setError('');
    try {
      // Create Admin
      const { error: adminError } = await supabase.auth.signUp({
        email: 'admin@planner.com',
        password: 'admin123',
        options: {
          data: {
            name: 'Administrador',
            role: 'ADMIN'
          }
        }
      });

      // Create Test User
      const { error: userError } = await supabase.auth.signUp({
        email: 'op001@planner.com',
        password: '123456',
        options: {
          data: {
            name: 'Operador Teste',
            role: 'USER',
            user_code: 'OP001'
          }
        }
      });

      if (adminError && !adminError.message.includes('already registered')) throw adminError;
      if (userError && !userError.message.includes('already registered')) throw userError;

      alert('Usuários de teste configurados! Se o Supabase exigir confirmação de e-mail, verifique sua caixa de entrada ou desative a confirmação no painel do Supabase (Authentication -> Settings).');
    } catch (err: any) {
      console.error('Seed error:', err);
      setError(`Erro ao configurar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-[#6366f1] rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/40 mb-6">
            <Calendar className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white font-black text-3xl leading-none tracking-tighter">Planner Bpo</h1>
        </div>

        <div className="glass-card p-10 rounded-[2.5rem] border border-white/5">
          <div className="flex gap-4 mb-8 p-1 bg-white/5 rounded-2xl">
            <button 
              onClick={() => setIsEmailLogin(true)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isEmailLogin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Admin
            </button>
            <button 
              onClick={() => setIsEmailLogin(false)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${!isEmailLogin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Usuário
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isEmailLogin ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@planner.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Código de Usuário</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value)}
                    placeholder="Ex: OP001"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white outline-none focus:border-indigo-500 transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold p-4 rounded-2xl text-center">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#6366f1] hover:bg-indigo-500 text-white py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-6 h-6" />
                  ENTRAR NO SISTEMA
                </>
              )}
            </button>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Credenciais de Teste</p>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-400">Admin:</span> admin@planner.com / admin123
                </p>
                <p className="text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-400">Usuário:</span> OP001 / 123456
                </p>
              </div>
              
              <button 
                type="button"
                onClick={handleSeedAdmin}
                className="mt-6 text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest transition-all underline underline-offset-4"
              >
                Configurar Admin Inicial (Primeiro Acesso)
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
