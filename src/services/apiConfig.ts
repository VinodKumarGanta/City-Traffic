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
