import type {NextConfig} from 'next';

const getR2Hostnames = (): string[] => {
  const hostnames = [
    'picsum.photos',
    'pub-416c5f7c39ea418b8489ced14502c0e8.r2.dev',
    'pub-435668dd3e6b40aaaa40027433b74b4a.r2.dev',
    'cdn.yellowsingam.com',
    '8eba151611035ada4eca5424bacf0f87.r2.cloudflarestorage.com',
    '*.r2.cloudflarestorage.com',
  ];

  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (publicUrl) {
    try {
      const parsed = new URL(publicUrl).hostname;
      if (parsed && !hostnames.includes(parsed)) {
        hostnames.push(parsed);
      }
    } catch (e) {
      // ignore invalid URLs
    }
  }
  return hostnames;
};

const allowedHostnames = getR2Hostnames();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev: allow loading /_next/* when the app is opened via LAN IP (not only localhost).
  allowedDevOrigins: [
    '169.254.186.50',
    '169.254.186.50:3000',
    'http://169.254.186.50:3000',
    '192.168.29.8',
    '192.168.29.8:3000',
    'http://192.168.29.8:3000',
    'localhost:3000',
    'http://localhost:3000'
  ],
  experimental: {
    // middleware.ts matches /api/* — Next buffers the body for middleware + route (default 10MB).
    // Large PDF multipart uploads to /api/editions need a higher limit or FormData.parse() fails.
    middlewareClientMaxBodySize: '100mb',
  },
  serverExternalPackages: ['pdf-to-img', 'pdfjs-dist', '@napi-rs/canvas'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    // Next.js 15 defaults to attachment on /_next/image; inline lets "Open image in new tab" display in-browser.
    contentDispositionType: 'inline',
    remotePatterns: allowedHostnames.map((hostname) => ({
      protocol: 'https',
      hostname,
      port: '',
      pathname: '/**',
    })),
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
