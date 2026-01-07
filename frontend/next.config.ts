import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desabilitar Turbopack para permitir route groups com mesmo path
  // Route groups (industry), (broker), (seller) têm rotas com mesmo path
  // que são diferenciadas pelo middleware baseado no role do usuário
  experimental: {
    // O Turbopack em Next.js 16 não suporta route groups com paths duplicados
  },
};

export default nextConfig;
