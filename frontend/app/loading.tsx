export default function Loading() {
  return (
    <div className="min-h-screen bg-mineral flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* CAVA Logo Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-slate-200 rounded-full" />
          <div className="absolute inset-0 border-2 border-transparent border-t-obsidian rounded-full animate-spin" />
        </div>
        
        {/* Brand text */}
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400 font-medium">
          CAVA
        </p>
      </div>
    </div>
  );
}
