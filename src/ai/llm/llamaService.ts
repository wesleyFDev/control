import { initLlama, type LlamaContext } from 'llama.rn';

import { aiLog, aiWarn, startTimer } from '../aiLog';

/**
 * Um único contexto do llama.rn por vez. O modelo de 1 GB leva alguns
 * segundos para carregar e ocupa bastante memória, então ele é carregado
 * na primeira vez que o chat precisa e liberado quando o app vai para o
 * segundo plano.
 */
let current: { path: string; context: Promise<LlamaContext> } | null = null;

export function loadContext(path: string): Promise<LlamaContext> {
  if (current && current.path === path) {
    aiLog('modelo: já carregado ou carregando, reaproveitando');
    return current.context;
  }
  const previous = current;
  const context = (async () => {
    if (previous) {
      aiLog('modelo: liberando o modelo anterior antes de trocar');
      await (await previous.context.catch(() => null))?.release();
    }
    aiLog('modelo: carregando', path);
    const elapsed = startTimer();
    const ctx = await initLlama(
      {
        model: `file://${path}`,
        // O prompt de classificação tem cerca de 400 tokens.
        n_ctx: 1024,
        // Usa a GPU (OpenCL) ou a NPU quando o aparelho tiver; senão, CPU.
        n_gpu_layers: 99,
        use_mlock: false,
      },
      progress => aiLog(`modelo: carregando ${Math.round(progress)}%`),
    );
    aiLog(`modelo: carregado em ${elapsed()} ms`, {
      gpu: ctx.gpu,
      motivoSemGpu: ctx.gpu ? undefined : ctx.reasonNoGPU,
      dispositivos: ctx.devices,
    });
    return ctx;
  })();
  current = { path, context };
  // Se falhar, a próxima chamada tenta carregar de novo.
  context.catch(error => {
    aiWarn('modelo: falhou ao carregar', error);
    if (current?.context === context) {
      current = null;
    }
  });
  return context;
}

export async function releaseContext(): Promise<void> {
  const loaded = current;
  current = null;
  if (loaded) {
    aiLog('modelo: liberando da memória');
    await (await loaded.context.catch(() => null))?.release();
    aiLog('modelo: liberado');
  }
}
