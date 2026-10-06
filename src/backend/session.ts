import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

type SessionState = {
  /** Ainda lendo a sessão salva no aparelho. */
  loading: boolean;
  session: Session | null;
};

let state: SessionState = { loading: Boolean(supabase), session: null };
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  listeners.forEach(listener => listener());
}

// A sessão salva é lida uma vez; depois, cada login, logout e renovação de
// token chega pelo onAuthStateChange.
if (supabase) {
  supabase.auth
    .getSession()
    .then(({ data }) => set({ loading: false, session: data.session }))
    .catch(() => set({ loading: false, session: null }));
  supabase.auth.onAuthStateChange((_event, session) =>
    set({ loading: false, session }),
  );
}

export function getSessionState(): SessionState {
  return state;
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribeSession, getSessionState);
}

/** Id do usuário logado, ou null. */
export function currentUserId(): string | null {
  return state.session?.user.id ?? null;
}
