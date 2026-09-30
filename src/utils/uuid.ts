/**
 * UUID versão 4 para os ids do banco local.
 * O Hermes não tem crypto.randomUUID, então os bytes vêm do Math.random.
 * É suficiente para ids únicos no aparelho e entre aparelhos da família.
 */
export function uuidv4(): string {
  const bytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256),
  );
  // Bits de versão (4) e variante do UUID, definidos pela RFC 4122.
  // eslint-disable-next-line no-bitwise
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // eslint-disable-next-line no-bitwise
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
