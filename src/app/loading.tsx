export default function Loading() {
  return (
    <main className="standalone" aria-busy="true">
      <div className="brand-word">
        KANO<span>.</span>
      </div>
      <p role="status">Preparando tu espacio…</p>
    </main>
  );
}
