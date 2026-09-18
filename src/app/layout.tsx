import type { Metadata } from 'next';
import { Bricolage_Grotesque, Figtree, Cormorant_Garamond } from 'next/font/google';
import MotionProvider from '@/components/MotionProvider';
import { ToastProvider } from '@/components/ui/Toast';
import BackgroundFX from '@/components/fx/BackgroundFX';
import './globals.css';

const fontBody = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const fontDisplay = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const fontDiploma = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-diploma',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Empoderas Diversas | Plataforma de Capacitación',
  description: 'Plataforma integral de formación, mentoría, clases virtuales y seguimiento de impacto para el empoderamiento y la diversidad.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${fontBody.variable} ${fontDisplay.variable} ${fontDiploma.variable}`}>
      <body className="bg-grain antialiased min-h-dvh font-sans text-slate-800 selection:bg-fuchsia-500 selection:text-white">
        <a href="#contenido" className="skip-link px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold shadow-lift">
          Saltar al contenido
        </a>
        <MotionProvider>
          <ToastProvider>
            <BackgroundFX />
            <div className="relative z-content">{children}</div>
          </ToastProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
