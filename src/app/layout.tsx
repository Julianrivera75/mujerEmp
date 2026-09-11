import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="es">
      <body className="antialiased min-h-screen selection:bg-fuchsia-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
