/**
 * Cifra as credenciais da Pluggy com AES-GCM antes de gravar no banco.
 * A chave fica no secret PLUGGY_CREDENTIALS_KEY: 32 bytes em base64.
 * Gere com: openssl rand -base64 32
 */

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function key(): Promise<CryptoKey> {
  const raw = Deno.env.get('PLUGGY_CREDENTIALS_KEY');
  if (!raw) {
    throw new Error('Secret PLUGGY_CREDENTIALS_KEY não configurado.');
  }
  const bytes = fromBase64(raw);
  if (bytes.length !== 32) {
    throw new Error('PLUGGY_CREDENTIALS_KEY precisa ter 32 bytes em base64.');
  }
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(
  plain: string,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await key(),
    new TextEncoder().encode(plain),
  );
  return { ciphertext: toBase64(new Uint8Array(data)), iv: toBase64(iv) };
}

export async function decrypt(ciphertext: string, iv: string): Promise<string> {
  const data = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    await key(),
    fromBase64(ciphertext),
  );
  return new TextDecoder().decode(data);
}
