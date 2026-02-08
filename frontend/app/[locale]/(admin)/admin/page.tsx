"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/industries");
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-mineral">
      <div className="animate-pulse text-slate-400">Redirecionando...</div>
    </div>
  );
}
