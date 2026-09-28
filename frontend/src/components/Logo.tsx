export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight text-stone-900 ${className}`}>
      <img src="/snail.svg" alt="" className="size-8" aria-hidden="true" />
      <span>
        Caracol <span className="text-brand-700">Derby</span>
      </span>
    </span>
  );
}
