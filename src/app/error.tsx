'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone">
      <h1>No pudimos abrir tu espacio</h1>
      <p>Comprobá que la base local esté disponible y volvé a intentar.</p>
      <button className="button primary" onClick={reset}>
        Volver a intentar
      </button>
    </main>
  );
}
