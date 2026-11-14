import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid-bg flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="font-orbitron text-8xl font-extrabold text-cyan text-glow-cyan sm:text-9xl">404</p>
      <h1 className="section-title mt-6 text-3xl sm:text-4xl">This world doesn&apos;t exist</h1>
      <p className="mt-3 max-w-md text-muted">The page you&apos;re looking for has left the arena. Let&apos;s get you back to reality.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="btn btn-cyan">
          Back to home
        </Link>
        <Link href="/booking" className="btn btn-red">
          Book an adventure
        </Link>
      </div>
    </main>
  );
}
