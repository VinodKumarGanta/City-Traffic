/**
 * Resolves the backend API base URL dynamically.
 * - When accessed locally from PC: 'http://localhost:5001'
 * - When accessed by friends/mobile phones on LAN: 'http://<LAN_IP>:5001'
 * - Can also be overridden by VITE_API_BASE_URL env var.
 */
export function getApiBaseUrl(): string {
  const metaEnv = (import.meta as unknown as { env?: { VITE_API_BASE_URL?: string } }).env || {};
  if (metaEnv.VITE_API_BASE_URL) {
    return metaEnv.VITE_API_BASE_URL;
  }
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${host}:5001`;
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

