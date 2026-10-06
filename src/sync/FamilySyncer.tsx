import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '../backend/session';
import { onExpensesChanged } from '../db/changeEvents';
import { runFamilySync } from './runFamilySync';

/** Espera um pouco depois de uma mudança, para juntar várias num envio só. */
const CHANGE_DELAY_MS = 3000;

function run() {
  runFamilySync().catch(error =>
    console.warn('[família] Falha ao sincronizar', error),
  );
}

/**
 * Sincroniza os gastos de família ao entrar na conta, ao voltar para o app
 * e logo depois de criar, editar ou apagar um gasto. Não desenha nada.
 */
export default function FamilySyncer() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) {
      return;
    }
    run();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const offChanges = onExpensesChanged(() => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(run, CHANGE_DELAY_MS);
    });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        run();
      }
    });
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      offChanges();
      subscription.remove();
    };
  }, [userId]);

  return null;
}
