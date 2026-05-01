// AES-GCM 256-bit encryption via Web Crypto API.
// Key is loaded from VITE_ENCRYPTION_KEY (base64-encoded 32 bytes).
// Set this in Vercel environment variables — never commit it to source.

const KEY_B64 = import.meta.env.VITE_ENCRYPTION_KEY as string | undefined

let _key: CryptoKey | null = null

async function getKey(): Promise<CryptoKey> {
  if (_key) return _key

  let raw: Uint8Array

  if (KEY_B64) {
    raw = Uint8Array.from(atob(KEY_B64), c => c.charCodeAt(0))
    if (raw.length !== 32) throw new Error('VITE_ENCRYPTION_KEY must be a base64-encoded 32-byte key')
  } else if (import.meta.env.PROD) {
    throw new Error('VITE_ENCRYPTION_KEY must be set in production. Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"')
  } else {
    // Dev-only fallback — never runs in production
    console.warn('[crypto] VITE_ENCRYPTION_KEY not set. Using insecure dev fallback. Set VITE_ENCRYPTION_KEY before deploying.')
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode('staff-travel-hub-dev-only'), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode('daf-fam-trips-dev') as unknown as ArrayBuffer, iterations: 200_000, hash: 'SHA-256' },
      keyMaterial,
      256,
    )
    raw = new Uint8Array(bits)
  }

  const keyBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
  _key = await crypto.subtle.importKey('raw', keyBuf, 'AES-GCM', false, ['encrypt', 'decrypt'])
  return _key
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
