import React, { useState } from 'react';
import { Calendar, Mail, Lock, User, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onLogin: (user: any) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (username === 'admin' && password === '1234') {
        const user = {
          id: 'admin-1',
          name: 'Administrador',
          email: 'admin@bpo.com',
          role: 'ADMIN',
          user_code: 'admin'
        };
        onLogin(user);
      } else if (username === 'user' && password === '1234') {
        const user = {
          id: 'user-1',
          name: 'Usuário Padrão',
          email: 'user@bpo.com',
          role: 'USER',
          user_code: 'user'
        };
        onLogin(user);
      } else {
        setError('Usuário ou senha incorretos.');
      }
      setLoading(false);
    }, 500);
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
          <h2 className="text-white text-xl font-bold mb-6 text-center">
            Entrar no Sistema
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Usuário</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Credenciais de Acesso</p>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-400">Admin:</span> admin / 1234
                </p>
                <p className="text-[10px] text-slate-400">
                  <span className="font-bold text-indigo-400">Usuário:</span> user / 1234
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
