'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'auth') {
      toast.error('No se pudo completar el inicio de sesión. Probá de nuevo.');
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/home');
    });
  }, [router]);

  const redirectTo = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=/home`;

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    setLoadingProvider(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    setLoadingProvider(null);
    if (error) {
      toast.error(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Completá email y contraseña');
      return;
    }
    setLoadingProvider('email');
    const supabase = createClient();
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: redirectTo },
      });
      setLoadingProvider(null);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Revisá tu correo para confirmar la cuenta (si está habilitado en el proyecto).');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoadingProvider(null);
      if (error) {
        toast.error(error.message);
        return;
      }
      router.replace('/home');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-[#0a0a0f] to-blue-900/20">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex justify-center mb-8"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Armemos una Salidita
          </h1>
          <p className="text-gray-400 text-lg">Organizá planes con tus amigos</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => signInWithOAuth('google')}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-white text-gray-900 shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">
              {loadingProvider === 'google' ? 'Conectando…' : 'Continuar con Google'}
            </span>
          </button>

          <button
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => signInWithOAuth('apple')}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-[#16161d] text-white border border-[#2a2a3a] shadow-lg hover:shadow-xl transition-all hover:border-purple-500/50 disabled:opacity-60"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span className="font-medium">
              {loadingProvider === 'apple' ? 'Conectando…' : 'Continuar con Apple'}
            </span>
          </button>

          <div className="relative flex items-center justify-center py-4">
            <div className="border-t border-[#2a2a3a] w-full" />
            <span className="absolute bg-[#0a0a0f] px-4 text-sm text-gray-500">o</span>
          </div>

          {!showEmailAuth ? (
            <button
              type="button"
              disabled={loadingProvider !== null}
              onClick={() => setShowEmailAuth(true)}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all hover:shadow-purple-500/50 disabled:opacity-60"
            >
              <span className="font-medium">Continuar con email</span>
            </button>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-3 rounded-2xl border border-[#2a2a3a] bg-[#16161d]/80 p-4">
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-3 rounded-2xl bg-[#0a0a0f] border border-[#2a2a3a] text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              <input
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="w-full px-4 py-3 rounded-2xl bg-[#0a0a0f] border border-[#2a2a3a] text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loadingProvider !== null}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium disabled:opacity-60"
              >
                {loadingProvider === 'email'
                  ? 'Procesando…'
                  : isSignUp
                    ? 'Crear cuenta'
                    : 'Ingresar'}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full text-sm text-gray-400 hover:text-gray-300"
              >
                {isSignUp ? '¿Ya tenés cuenta? Ingresá' : '¿No tenés cuenta? Registrate'}
              </button>
            </form>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-gray-500 mt-8"
        >
          Al continuar, aceptás nuestros términos y condiciones
        </motion.p>
      </div>
    </div>
  );
}
