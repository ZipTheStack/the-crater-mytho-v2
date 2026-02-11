// Audio storage adapter for Cloudflare R2 (client-side calls Supabase edge function)
// Behavior:
// - If R2 feature enabled (`VITE_R2_ENABLED=true`), the adapter will call the
//   Supabase edge function at `${VITE_SUPABASE_URL}/functions/v1/r2-signed-url` to obtain signed URLs.
// - Otherwise it falls back to existing Supabase Storage behavior (not implemented here).

const R2_ENABLED = import.meta.env.VITE_R2_ENABLED === 'true'
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')

function functionUrl() {
  return `${SUPABASE_URL}/functions/v1/r2-signed-url`
}

export async function getUploadUrl({ key, contentType }: { key: string, contentType: string }) {
  if (!R2_ENABLED) throw new Error('R2 not enabled')
  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL not configured')

  const res = await fetch(`${functionUrl()}/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, contentType })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to get upload URL: ${text}`)
  }

  return res.json()
}

export function getStreamUrl(key: string) {
  if (!R2_ENABLED) throw new Error('R2 not enabled')
  if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL not configured')
  return `${functionUrl()}/get?key=${encodeURIComponent(key)}`
}

export default { getUploadUrl, getStreamUrl }
