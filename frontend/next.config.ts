import type { NextConfig } from "next";

// PostHog through our own origin (their recommended setup): ad blockers that
// drop *.posthog.com requests don't drop ours. US cloud (decisions/analytics.md).
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const POSTHOG_ASSETS = POSTHOG_HOST.replace("://us.i.", "://us-assets.i.").replace("://eu.i.", "://eu-assets.i.");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {source: "/ingest/static/:path*", destination: `${POSTHOG_ASSETS}/static/:path*`},
      {source: "/ingest/:path*", destination: `${POSTHOG_HOST}/:path*`},
    ];
  },
  // PostHog's endpoints end in a slash ("/e/"); don't redirect them away.
  skipTrailingSlashRedirect: true,
  // The product screenshots (public/product, WebP) go out as AVIF where the browser takes it.
  images: {formats: ["image/avif", "image/webp"]},
};

export default nextConfig;
