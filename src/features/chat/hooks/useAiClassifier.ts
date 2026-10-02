import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';

import { classifyCategory } from '../../../ai/llm/categoryClassifier';
import { aiLog } from '../../../ai/aiLog';
import { loadContext, releaseContext } from '../../../ai/llm/llamaService';
import type { CategoryClassifier } from '../../../ai/refineWithAi';
import { getCategories } from '../../expenses/categories';
import { useOptionalModelStatus } from '../../aiSetup/ModelContext';

/**
 * Classificador de categoria ligado ao modelo instalado.
 * Devolve null quando não há modelo, e o chat segue só com as regras.
 *
 * O modelo começa a carregar assim que o chat abre, para a primeira
 * mensagem não esperar o carregamento inteiro. Quando o app vai para o
 * segundo plano, o modelo é liberado da memória.
 */
export function useAiClassifier(): CategoryClassifier | null {
  const model = useOptionalModelStatus();
  const path = model?.status.state === 'ready' ? model.status.path : null;

  useEffect(() => {
    if (!path) {
      aiLog('chat: sem modelo instalado, usando só as regras');
      return;
    }
    aiLog('chat: aberto, pré-carregando o modelo');
    loadContext(path).catch(error =>
      console.warn('[ia] Não foi possível carregar o modelo', error),
    );
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') {
        aiLog('app: foi para o segundo plano');
        releaseContext();
      }
    });
    return () => subscription.remove();
  }, [path]);

  return useMemo(() => {
    if (!path) {
      return null;
    }
    return async (text: string) => {
      const context = await loadContext(path);
      return classifyCategory(context, text, getCategories());
    };
  }, [path]);
}
