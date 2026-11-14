export default function Loading() {
  return (
    <div className="container-x animate-pulse pb-10 pt-32 sm:pt-40" role="status" aria-label="Loading">
      <div className="h-4 w-32 rounded bg-cyan/20" />
      <div className="mt-4 h-12 w-3/4 max-w-xl rounded bg-white/10" />
      <div className="mt-3 h-5 w-1/2 max-w-md rounded bg-white/5" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card-neon h-72" />
        ))}
      </div>
    </div>
  );
}
