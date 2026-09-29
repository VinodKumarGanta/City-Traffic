/**
 * Resolves the backend API base URL dynamically.
 * Priority order:
 *   1. VITE_API_BASE_URL env var (set in Cloudflare Pages dashboard or .env.production)
 *   2. localhost:5001 when running locally (dev mode)
 *   3. Empty string + graceful offline mode when deployed without a backend URL
 */
export function getApiBaseUrl(): string {
  const metaEnv = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string; MODE?: string } }).env || {};

  // 1. Explicit override — highest priority (set this in Cloudflare Pages env vars)
  if (metaEnv.VITE_API_BASE_URL) {
    return metaEnv.VITE_API_BASE_URL.replace(/\/$/, ''); // strip trailing slash
  }

  // 2. Local development — use localhost
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If running on localhost or LAN IP → backend is on same machine port 5001
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^192\.168\.|^10\.|^172\./.test(hostname)) {
      return `http://${hostname}:5001`;
    }
    // 3. Deployed on Cloudflare Pages / custom domain without backend URL configured
    // Return empty so the app loads in "offline/demo" mode instead of crashing
    return '';
  }

  return 'http://localhost:5001';
}

// Global cached gateway status to prevent request flooding from multiple camera cards
let cachedGatewayStatus: { online: boolean; sources: Record<string, string>; timestamp: number } | null = null;
let pendingGatewayCheck: Promise<{ online: boolean; sources: Record<string, string> }> | null = null;

export async function getCachedGatewayStatus(maxAgeMs = 10000): Promise<{ online: boolean; sources: Record<string, string> }> {
  const now = Date.now();
  if (cachedGatewayStatus && now - cachedGatewayStatus.timestamp < maxAgeMs) {
    return { online: cachedGatewayStatus.online, sources: cachedGatewayStatus.sources };
  }
  if (pendingGatewayCheck) {
    return pendingGatewayCheck;
  }
  pendingGatewayCheck = (async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/status`, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        cachedGatewayStatus = {
          online: true,
          sources: data.sources || {},
          timestamp: Date.now()
        };
        return { online: true, sources: data.sources || {} };
      }
    } catch {
      // Gateway offline or starting up
    } finally {
      pendingGatewayCheck = null;
    }
    cachedGatewayStatus = { online: false, sources: {}, timestamp: Date.now() };
    return { online: false, sources: {} };
  })();
  return pendingGatewayCheck;
}

