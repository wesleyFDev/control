import { useSyncExternalStore } from 'react';

import { getCategories, subscribeCategories } from '../categories';

/** Categorias atuais do registro, com atualização quando as configurações mudam. */
export function useCategories() {
  return useSyncExternalStore(subscribeCategories, getCategories);
}
