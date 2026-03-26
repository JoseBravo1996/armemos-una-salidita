import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Armemos una Salidita',
  description: 'Organizá planes con tus amigos',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <div className="dark min-h-screen bg-background text-foreground">
          <Providers initialUser={user}>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
