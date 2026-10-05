import { useEffect } from 'react';
import { AppState } from 'react-native';

import { bankNotifications, notificationsSupported } from './bankNotifications';
import { ingestBankNotifications } from './ingestNotifications';

/**
 * Lê a fila de notificações de banco ao abrir o app e sempre que ele volta
 * para o primeiro plano. Não desenha nada.
 */
export default function NotificationsIngestor() {
  useEffect(() => {
    if (!notificationsSupported) {
      return;
    }
    const run = () => {
      // Alguns fabricantes derrubam o serviço de notificações em segundo
      // plano. Pedir para reconectar ao abrir o app mantém a captura ativa.
      bankNotifications.requestRebind().catch(() => undefined);
      ingestBankNotifications().catch(error =>
        console.warn('[notificações] Falha ao ler a fila', error),
      );
    };
    run();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        run();
      }
    });
    return () => subscription.remove();
  }, []);
  return null;
}
