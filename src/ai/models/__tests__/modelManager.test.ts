import { MODELS } from '../registry';

const MODEL = MODELS[0];
const DIR = '/sdcard/app/models';
const FINAL = `${DIR}/${MODEL.fileName}`;

type FakeFile = { content: string; size: number; hash: string };

const mockFiles = new Map<string, FakeFile>();
let mockFree = MODEL.sizeBytes * 2;
let mockStatus = 200;
let mockDownloaded: FakeFile = {
  content: 'gguf',
  size: MODEL.sizeBytes,
  hash: MODEL.sha256,
};
const mockCancel = jest.fn();

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

jest.mock('llama.rn', () => ({
  loadLlamaModelInfo: jest.fn(async () => ({ general: 'qwen2' })),
}));

jest.mock('react-native-blob-util', () => {
  const fs = {
    dirs: { DocumentDir: '/docs' },
    isDir: async () => true,
    mkdir: async () => undefined,
    exists: async (path: string) => mockFiles.has(path),
    readFile: async (path: string) => mockFiles.get(path)?.content ?? '',
    writeFile: async (path: string, content: string) => {
      mockFiles.set(path, { content, size: content.length, hash: '' });
    },
    unlink: async (path: string) => {
      mockFiles.delete(path);
    },
    stat: async (path: string) => ({ size: mockFiles.get(path)?.size ?? 0 }),
    hash: async (path: string) => mockFiles.get(path)?.hash ?? '',
    mv: async (from: string, to: string) => {
      const file = mockFiles.get(from);
      if (file) {
        mockFiles.set(to, file);
        mockFiles.delete(from);
      }
      return true;
    },
    df: async () => ({ external_free: String(mockFree) }),
  };
  return {
    __esModule: true,
    default: {
      fs,
      android: { getSDCardApplicationDir: async () => '/sdcard/app' },
      config: ({ path }: { path: string }) => ({
        fetch: () => {
          const response = {
            info: () => ({ status: mockStatus }),
          };
          const promise = Promise.resolve().then(() => {
            mockFiles.set(path, mockDownloaded);
            return response;
          });
          return Object.assign(promise, {
            cancel: mockCancel,
            progress: (
              _config: unknown,
              callback: (received: number, total: number) => void,
            ) => {
              callback(mockDownloaded.size / 2, mockDownloaded.size);
              return promise;
            },
          });
        },
      }),
    },
  };
});

import {
  deleteInstalledModel,
  downloadModel,
  getModelStatus,
  isSetupSkipped,
  skipSetup,
} from '../modelManager';

beforeEach(() => {
  mockFiles.clear();
  mockFree = MODEL.sizeBytes * 2;
  mockStatus = 200;
  mockDownloaded = {
    content: 'gguf',
    size: MODEL.sizeBytes,
    hash: MODEL.sha256,
  };
});

describe('modelManager', () => {
  it('começa sem modelo', async () => {
    expect(await getModelStatus()).toEqual({ state: 'missing' });
  });

  it('baixa, confere o SHA-256 e marca como instalado', async () => {
    const phases: string[] = [];
    const task = downloadModel(MODEL, p => phases.push(p.phase));
    const status = await task.promise;

    expect(status).toEqual({ state: 'ready', model: MODEL, path: FINAL });
    expect(phases).toEqual(
      expect.arrayContaining(['downloading', 'verifying', 'checking']),
    );
    expect(mockFiles.has(`${FINAL}.part`)).toBe(false);
    expect(await getModelStatus()).toEqual(status);
  });

  it('recusa um arquivo com SHA-256 diferente e apaga o temporário', async () => {
    mockDownloaded = { content: 'x', size: MODEL.sizeBytes, hash: 'errado' };
    await expect(downloadModel(MODEL, () => undefined).promise).rejects.toThrow(
      'corrompido',
    );
    expect(mockFiles.has(`${FINAL}.part`)).toBe(false);
    expect(await getModelStatus()).toEqual({ state: 'missing' });
  });

  it('avisa quando falta espaço', async () => {
    mockFree = 1000;
    await expect(downloadModel(MODEL, () => undefined).promise).rejects.toThrow(
      'espaço',
    );
  });

  it('avisa quando o servidor responde com erro', async () => {
    mockStatus = 404;
    await expect(downloadModel(MODEL, () => undefined).promise).rejects.toThrow(
      'erro 404',
    );
  });

  it('aproveita um arquivo copiado pelo adb sem baixar de novo', async () => {
    mockFiles.set(FINAL, {
      content: 'gguf',
      size: MODEL.sizeBytes,
      hash: MODEL.sha256,
    });
    const phases: string[] = [];
    await downloadModel(MODEL, p => phases.push(p.phase)).promise;
    expect(phases).not.toContain('downloading');
    expect((await getModelStatus()).state).toBe('ready');
  });

  it('trata como ausente um arquivo com tamanho errado', async () => {
    await downloadModel(MODEL, () => undefined).promise;
    mockFiles.set(FINAL, { content: 'x', size: 10, hash: '' });
    expect(await getModelStatus()).toEqual({ state: 'missing' });
  });

  it('lembra quando o usuário escolhe "Agora não", até instalar', async () => {
    expect(await isSetupSkipped()).toBe(false);
    await skipSetup();
    expect(await isSetupSkipped()).toBe(true);
    await downloadModel(MODEL, () => undefined).promise;
    expect(await isSetupSkipped()).toBe(false);
  });

  it('remove o modelo instalado', async () => {
    await downloadModel(MODEL, () => undefined).promise;
    await deleteInstalledModel();
    expect(mockFiles.has(FINAL)).toBe(false);
    expect(await getModelStatus()).toEqual({ state: 'missing' });
  });
});
