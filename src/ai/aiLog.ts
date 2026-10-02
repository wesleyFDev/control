/**
 * Logs de cada passo da IA, para acompanhar no terminal do Metro.
 * Só aparecem no build de debug, e ficam em silêncio nos testes do Jest.
 *
 * Exemplo de saída:
 *   [IA 14:02:31.512] chat: mensagem recebida "comprei maçã por 20"
 */
const runningInJest = Boolean(
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env?.JEST_WORKER_ID,
);

const enabled = typeof __DEV__ !== 'undefined' && __DEV__ && !runningInJest;

function clock(): string {
  const now = new Date();
  const pad = (n: number, size = 2) => String(n).padStart(size, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(
    now.getSeconds(),
  )}.${pad(now.getMilliseconds(), 3)}`;
}

export function aiLog(step: string, ...details: unknown[]): void {
  if (enabled) {
    console.log(`[IA ${clock()}] ${step}`, ...details);
  }
}

export function aiWarn(step: string, ...details: unknown[]): void {
  if (enabled) {
    console.warn(`[IA ${clock()}] ${step}`, ...details);
  }
}

/** Cronômetro: chame no início e use o retorno para saber quantos ms passaram. */
export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
