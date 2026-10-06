/**
 * Aviso de que os gastos locais mudaram. A sincronização da família escuta
 * para enviar logo os gastos de família novos ou editados.
 */
const listeners = new Set<() => void>();

export function onExpensesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitExpensesChanged(): void {
  listeners.forEach(listener => listener());
}
