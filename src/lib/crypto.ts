// AES-GCM 256-bit encryption via Web Crypto API.
//
// The 32-byte key is NOT baked into the client bundle in production. Instead it
// lives in a server-only env var (ENCRYPTION_KEY_B64) and is fetched once, at
// runtime, from an authenticated endpoint (/api/list-users?mode=enckey) — so an
// anonymous visitor who loads the site never receives it.
//
// For local dev you may still set VITE_ENCRYPTION_KEY (it only ends up in your
// local dev bundle, never production); if neither is available in dev, an
// insecure PBKDF2 fallback is used.

import { auth } from './firebase'

const KEY_B64 = import.meta.env.VITE_ENCRYPTION_KEY as string | undefined

let _key: CryptoKey | null = null
let _keyPromise: Promise<CryptoKey> | null = null

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0))

async function importKeyBytes(raw: Uint8Array): Promise<CryptoKey> {
  if (raw.length !== 32) throw new Error('Encryption key must be 32 bytes (base64-encoded)')
  const keyBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
  return crypto.subtle.importKey('raw', keyBuf, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function fetchServerKey(): Promise<Uint8Array> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Must be signed in to load the encryption key')
  const res = await fetch('/api/list-users?mode=enckey', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Encryption key fetch failed: ${res.status}`)
  const { key } = (await res.json()) as { key?: string }
  if (!key) throw new Error('Encryption key not configured on the server')
  return b64ToBytes(key)
}

async function getKey(): Promise<CryptoKey> {
  if (_key) return _key
  if (_keyPromise) return _keyPromise

  _keyPromise = (async () => {
    // 1. Build-time key (dev / legacy only). In production this is intentionally
    //    unset, so the key never ships inside the public JS bundle.
    if (KEY_B64) {
      _key = await importKeyBytes(b64ToBytes(KEY_B64))
      return _key
    }

    // 2. Production path: fetch the key at runtime from the authenticated endpoint.
    try {
      _key = await importKeyBytes(await fetchServerKey())
      return _key
    } catch (err) {
      if (import.meta.env.PROD) throw err

      // 3. Dev-only insecure fallback — never runs in production.
      console.warn('[crypto] No encryption key available. Using insecure dev fallback.')
      const enc = new TextEncoder()
      const keyMaterial = await crypto.subtle.importKey('raw', enc.encode('staff-travel-hub-dev-only'), 'PBKDF2', false, ['deriveBits'])
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode('daf-fam-trips-dev') as unknown as ArrayBuffer, iterations: 200_000, hash: 'SHA-256' },
        keyMaterial,
        256,
      )
      _key = await importKeyBytes(new Uint8Array(bits))
      return _key
    }
  })()

  try {
    return await _keyPromise
  } catch (e) {
    _keyPromise = null // allow a retry on the next call
    throw e
  }
}

/** Encrypts a string and returns a base64-encoded `iv:ciphertext` blob. */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey()
  const iv  = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const ct  = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext))
  const buf = new Uint8Array(12 + ct.byteLength)
  buf.set(iv)
  buf.set(new Uint8Array(ct), 12)
  return btoa(String.fromCharCode(...buf))
}

/** Decrypts a base64-encoded blob produced by `encrypt`. */
export async function decrypt(blob: string): Promise<string> {
  const key = await getKey()
  const buf = Uint8Array.from(atob(blob), c => c.charCodeAt(0))
  const iv  = buf.slice(0, 12)
  const ct  = buf.slice(12)
  const pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

/** Encrypts a value if non-null/non-empty, otherwise returns null. */
export async function encryptField(value: string | null): Promise<string | null> {
  return value !== null && value !== '' ? encrypt(value) : null
}

/** Decrypts a value if non-null, otherwise returns null. */
export async function decryptField(value: string | null): Promise<string | null> {
  return value !== null ? decrypt(value) : null
}
