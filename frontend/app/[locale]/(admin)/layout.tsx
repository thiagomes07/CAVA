"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Sidebar } from "@/components/shared/Sidebar";
import { BackButton } from "@/components/shared/BackButton";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
      return;
    }

    // Verificar se usuário é SUPER_ADMIN
    if (!isLoading && user && user.role !== "SUPER_ADMIN") {
      // Redirecionar para dashboard apropriado
      if (user.role === "BROKER") {
        router.push("/dashboard");
      } else if (user.industrySlug) {
        router.push(`/${user.industrySlug}/dashboard`);
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-mineral">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    );
  }

  // Não renderizar nada se não for SUPER_ADMIN
  if (!user || user.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-mineral">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b border-slate-200/10">
          <BackButton />
        </div>
        <div className="flex-1 overflow-y-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
