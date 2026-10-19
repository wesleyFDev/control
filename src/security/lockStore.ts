import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import {
  authenticate,
  disableLock,
  enableLock,
  isLockEnabled,
  setSecureScreen,
} from './appLock';

/**
 * Estado do bloqueio, compartilhado entre a trava da tela e o interruptor
 * das configurações.
 *
 * - checking: lendo se o bloqueio está ligado.
 * - disabled: bloqueio desligado.
 * - locked: precisa da digital/senha para ver o app.
 * - unlocked: liberado até ir para o segundo plano.
 */
export type LockStatus = 'checking' | 'disabled' | 'locked' | 'unlocked';

/**
 * Tempo fora do app sem pedir de novo. Também cobre a tela de PIN do
 * Android, que abre por cima e conta como segundo plano.
 */
export const LOCK_GRACE_MS = 60 * 1000;

let status: LockStatus = 'checking';
let authenticating = false;
let backgroundAt: number | null = null;
const listeners = new Set<() => void>();

function set(next: LockStatus) {
  status = next;
  listeners.forEach(listener => listener());
}

export function getLockStatus(): LockStatus {
  return status;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLockStatus(): LockStatus {
  return useSyncExternalStore(subscribe, getLockStatus);
}

/** Lê a configuração ao abrir o app. */
export async function initLock(): Promise<void> {
  try {
    const enabled = await isLockEnabled();
    set(enabled ? 'locked' : 'disabled');
    // Mantém a proteção dos recentes alinhada com o bloqueio.
    await setSecureScreen(enabled).catch(() => undefined);
  } catch {
    set('disabled');
  }
}

/** Pede a digital/senha. Chamadas repetidas enquanto a tela está aberta são ignoradas. */
export async function unlock(): Promise<boolean> {
  if (authenticating || status !== 'locked') {
    return status === 'unlocked';
  }
  authenticating = true;
  try {
    const ok = await authenticate();
    if (ok) {
      set('unlocked');
    }
    return ok;
  } finally {
    authenticating = false;
    backgroundAt = null;
  }
}

export async function turnLockOn(): Promise<void> {
  authenticating = true;
  try {
    await enableLock();
    set('unlocked');
  } finally {
    authenticating = false;
    backgroundAt = null;
  }
}

export async function turnLockOff(): Promise<void> {
  authenticating = true;
  try {
    await disableLock();
    set('disabled');
  } finally {
    authenticating = false;
    backgroundAt = null;
  }
}

/** Decide se trava ao voltar para o app. Exportada para os testes. */
export function handleAppStateChange(next: string, now = Date.now()): void {
  if (authenticating) {
    return;
  }
  if (next === 'background') {
    backgroundAt = now;
    return;
  }
  if (next === 'active') {
    const away = backgroundAt === null ? 0 : now - backgroundAt;
    backgroundAt = null;
    if (status === 'unlocked' && away > LOCK_GRACE_MS) {
      set('locked');
    }
  }
}

AppState.addEventListener('change', state => handleAppStateChange(state));

/** Só para os testes. */
export function resetLockStoreForTests(next: LockStatus): void {
  status = next;
  authenticating = false;
  backgroundAt = null;
}
