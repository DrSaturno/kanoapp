import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="standalone">
      <h1>No encontramos esta página</h1>
      <Link className="button primary" href="/">
        Ir al inicio
      </Link>
    </main>
  );
}
