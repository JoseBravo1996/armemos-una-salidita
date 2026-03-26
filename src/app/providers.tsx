'use client';

import { ThemeProvider } from 'next-themes';
import type { User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { Toaster } from '@/app/components/ui/sonner';
import { AuthProvider } from '@/lib/auth/auth-context';

export function Providers({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User | null;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
      <AuthProvider initialUser={initialUser}>
        {children}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
