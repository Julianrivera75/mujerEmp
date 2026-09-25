'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#faf5ff', color: '#1e293b' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 24, margin: 0 }}>Algo salió mal</h1>
          <p style={{ color: '#64748b', maxWidth: 360 }}>
            La aplicación tuvo un error inesperado. Intenta de nuevo en unos segundos.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              padding: '10px 20px',
              border: 0,
              borderRadius: 12,
              background: '#9333ea',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
