import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { loadLlamaModelInfo } from 'llama.rn';

import { getModel, type ModelInfo } from './registry';

/**
 * Guarda e baixa o modelo de linguagem.
 *
 * No Android, os arquivos ficam na pasta externa própria do app:
 * /sdcard/Android/data/<applicationId>/files/models. O app lê essa pasta
 * sem pedir permissão, e o `adb push` consegue gravar nela, o que permite
 * copiar o modelo do computador sem baixar de novo. Desinstalar o app
 * apaga essa pasta.
 */

const { fs } = ReactNativeBlobUtil;

/** Arquivo que registra qual modelo foi instalado e verificado. */
const SELECTED_FILE = 'selected.json';
/** Arquivo que registra que o usuário escolheu usar o app sem IA por enquanto. */
const SKIPPED_FILE = 'setup-skipped';

export type ModelStatus =
  | { state: 'ready'; model: ModelInfo; path: string }
  | { state: 'missing' };

export type DownloadPhase = 'downloading' | 'verifying' | 'checking';

export type DownloadProgress = {
  phase: DownloadPhase;
  receivedBytes: number;
  totalBytes: number;
};

export class ModelDownloadError extends Error {}

let modelsDirCache: string | null = null;

export async function getModelsDir(): Promise<string> {
  if (modelsDirCache) {
    return modelsDirCache;
  }
  const base =
    Platform.OS === 'android'
      ? await ReactNativeBlobUtil.android.getSDCardApplicationDir()
      : fs.dirs.DocumentDir;
  const dir = `${base}/models`;
  if (!(await fs.isDir(dir))) {
    await fs.mkdir(dir);
  }
  modelsDirCache = dir;
  return dir;
}

export async function getModelPath(model: ModelInfo): Promise<string> {
  return `${await getModelsDir()}/${model.fileName}`;
}

/**
 * Situação do modelo na abertura do app. Confere se o arquivo existe e se o
 * tamanho bate. O SHA-256 completo só é calculado depois do download, porque
 * ler 0,4 a 1 GB em toda abertura deixaria o app lento.
 */
export async function getModelStatus(): Promise<ModelStatus> {
  const dir = await getModelsDir();
  const selectedPath = `${dir}/${SELECTED_FILE}`;
  if (!(await fs.exists(selectedPath))) {
    return { state: 'missing' };
  }
  try {
    const { id } = JSON.parse(await fs.readFile(selectedPath, 'utf8'));
    const model = getModel(id);
    if (!model) {
      return { state: 'missing' };
    }
    const path = await getModelPath(model);
    if (!(await fs.exists(path))) {
      return { state: 'missing' };
    }
    const stat = await fs.stat(path);
    if (Number(stat.size) !== model.sizeBytes) {
      return { state: 'missing' };
    }
    return { state: 'ready', model, path };
  } catch {
    return { state: 'missing' };
  }
}

export async function isSetupSkipped(): Promise<boolean> {
  return fs.exists(`${await getModelsDir()}/${SKIPPED_FILE}`);
}

export async function skipSetup(): Promise<void> {
  await fs.writeFile(`${await getModelsDir()}/${SKIPPED_FILE}`, '1', 'utf8');
}

async function removeIfExists(path: string): Promise<void> {
  if (await fs.exists(path)) {
    await fs.unlink(path);
  }
}

/** Espaço livre onde o modelo será gravado, em bytes. null se não souber. */
async function freeBytes(): Promise<number | null> {
  try {
    const df = await fs.df();
    const value =
      Platform.OS === 'android'
        ? (df as { external_free?: string }).external_free
        : (df as { free?: number }).free;
    return value === undefined ? null : Number(value);
  } catch {
    return null;
  }
}

/**
 * Se o arquivo final já estiver na pasta, por exemplo copiado pelo
 * `adb push`, e o SHA-256 bater, ele é aproveitado sem baixar nada.
 */
async function verifyFile(model: ModelInfo, path: string): Promise<boolean> {
  if (!(await fs.exists(path))) {
    return false;
  }
  const stat = await fs.stat(path);
  if (Number(stat.size) !== model.sizeBytes) {
    return false;
  }
  const hash = await fs.hash(path, 'sha256');
  return hash.toLowerCase() === model.sha256;
}

async function markInstalled(model: ModelInfo): Promise<void> {
  const dir = await getModelsDir();
  await fs.writeFile(
    `${dir}/${SELECTED_FILE}`,
    JSON.stringify({ id: model.id, installedAt: new Date().toISOString() }),
    'utf8',
  );
  await removeIfExists(`${dir}/${SKIPPED_FILE}`);
}

export type DownloadTask = {
  promise: Promise<ModelStatus>;
  cancel: () => void;
};

/**
 * Baixa o modelo para um arquivo temporário, confere tamanho e SHA-256,
 * abre o GGUF para confirmar que o llama.rn consegue ler e só então
 * renomeia para o nome final. Um download interrompido nunca é
 * confundido com um modelo pronto.
 */
export function downloadModel(
  model: ModelInfo,
  onProgress: (progress: DownloadProgress) => void,
): DownloadTask {
  let cancelled = false;
  let cancelFetch: (() => void) | null = null;

  const promise = (async (): Promise<ModelStatus> => {
    const finalPath = await getModelPath(model);
    const partPath = `${finalPath}.part`;

    onProgress({ phase: 'verifying', receivedBytes: 0, totalBytes: 0 });
    if (!(await verifyFile(model, finalPath))) {
      const free = await freeBytes();
      if (free !== null && free < model.sizeBytes * 1.1) {
        throw new ModelDownloadError(
          'Não há espaço livre suficiente no celular para o modelo.',
        );
      }

      await removeIfExists(partPath);
      const request = ReactNativeBlobUtil.config({
        path: partPath,
        fileCache: true,
        overwrite: true,
        followRedirect: true,
      }).fetch('GET', model.url);
      cancelFetch = () => request.cancel();

      const response = await request.progress(
        { interval: 250 },
        (received, total) =>
          onProgress({
            phase: 'downloading',
            receivedBytes: Number(received),
            totalBytes: Number(total) || model.sizeBytes,
          }),
      );
      cancelFetch = null;

      const status = response.info().status;
      if (status < 200 || status >= 300) {
        await removeIfExists(partPath);
        throw new ModelDownloadError(
          `O servidor respondeu com erro ${status}. Tente de novo mais tarde.`,
        );
      }

      onProgress({
        phase: 'verifying',
        receivedBytes: model.sizeBytes,
        totalBytes: model.sizeBytes,
      });
      if (!(await verifyFile(model, partPath))) {
        await removeIfExists(partPath);
        throw new ModelDownloadError(
          'O arquivo baixado veio corrompido ou incompleto. Tente de novo.',
        );
      }
      await removeIfExists(finalPath);
      await fs.mv(partPath, finalPath);
    }

    onProgress({
      phase: 'checking',
      receivedBytes: model.sizeBytes,
      totalBytes: model.sizeBytes,
    });
    try {
      await loadLlamaModelInfo(`file://${finalPath}`);
    } catch (error) {
      throw new ModelDownloadError(
        `O modelo foi baixado, mas não abriu no aparelho: ${String(error)}`,
      );
    }

    await markInstalled(model);
    return { state: 'ready', model, path: finalPath };
  })().catch(async error => {
    if (cancelled) {
      await removeIfExists(`${await getModelPath(model)}.part`).catch(
        () => undefined,
      );
      throw new ModelDownloadError('Download cancelado.');
    }
    throw error;
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      cancelFetch?.();
    },
  };
}

/** Apaga o modelo instalado. O app volta a funcionar só com as regras. */
export async function deleteInstalledModel(): Promise<void> {
  const status = await getModelStatus();
  const dir = await getModelsDir();
  if (status.state === 'ready') {
    await removeIfExists(status.path);
  }
  await removeIfExists(`${dir}/${SELECTED_FILE}`);
}
