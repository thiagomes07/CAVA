import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Desabilitar Turbopack para permitir route groups com mesmo path
  // Route groups (industry), (broker), (seller) têm rotas com mesmo path
  // que são diferenciadas pelo middleware baseado no role do usuário
  experimental: {
    // O Turbopack em Next.js 16 não suporta route groups com paths duplicados
  },

  turbopack: {
    // Ensure the app root is this frontend folder even if there are lockfiles above it.
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
