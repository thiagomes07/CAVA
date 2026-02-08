import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Desabilitar Turbopack para permitir route groups com mesmo path
  // Route groups (industry), (broker), (seller) têm rotas com mesmo path
  // que são diferenciadas pelo middleware baseado no role do usuário
  experimental: {
    // O Turbopack em Next.js 16 não suporta route groups com paths duplicados
  },

  output: "standalone",

  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  turbopack: {
    // Ensure the app root is this frontend folder even if there are lockfiles above it.
    root: path.resolve(__dirname),
  },

  // Configuração de imagens para otimização com next/image
  images: {
    // Permitir imagens apenas de domínios confiáveis (evita SSRF via /_next/image)
    remotePatterns: [
      // Produção: imagens servidas via S3/CloudFront (configurado via env var)
      ...(process.env.NEXT_PUBLIC_IMAGE_HOSTNAME
        ? [
            {
              protocol: 'https' as const,
              hostname: process.env.NEXT_PUBLIC_IMAGE_HOSTNAME,
            },
          ]
        : []),
      // Desenvolvimento: MinIO local e Backend API
      ...(process.env.NODE_ENV === 'development'
        ? [
            {
              protocol: 'http' as const,
              hostname: 'localhost',
              port: '9000', // MinIO
            },
            {
              protocol: 'http' as const,
              hostname: 'localhost',
              port: '3001', // Backend API
            },
          ]
        : []),
    ],
    // Formatos de imagem otimizados
    formats: ['image/avif', 'image/webp'],
    // Tamanhos de dispositivo para responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Tamanhos para imagens com width fixo
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default withNextIntl(nextConfig);
