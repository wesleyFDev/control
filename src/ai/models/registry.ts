/**
 * Modelos de linguagem que o app sabe baixar.
 * As URLs apontam para uma revisão fixa do Hugging Face, para o arquivo não
 * mudar por baixo do app. O SHA-256 e o tamanho vêm da API do Hugging Face
 * para essa mesma revisão.
 */
export type ModelInfo = {
  id: string;
  /** Nome curto mostrado na tela de setup. */
  label: string;
  description: string;
  fileName: string;
  url: string;
  sizeBytes: number;
  sha256: string;
  /** RAM total recomendada no aparelho, em GB. */
  minRamGb: number;
};

export const MODELS: ModelInfo[] = [
  {
    id: 'qwen2.5-0.5b-instruct-q4_0',
    label: 'Leve',
    description:
      'Qwen 2.5 com 0,5 bilhão de parâmetros. Mais rápido e usa menos memória. Recomendado para começar.',
    fileName: 'qwen2.5-0.5b-instruct-q4_0.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/qwen2.5-0.5b-instruct-q4_0.gguf',
    sizeBytes: 428730208,
    sha256: '7671c0c304e6ce5a7fc577bcb12aba01e2c155cc2efd29b2213c95b18edaf6ed',
    minRamGb: 3,
  },
  {
    id: 'qwen2.5-1.5b-instruct-q4_0',
    label: 'Mais preciso',
    description:
      'Qwen 2.5 com 1,5 bilhão de parâmetros. Entende melhor frases difíceis, mas é mais lento e precisa de mais memória.',
    fileName: 'qwen2.5-1.5b-instruct-q4_0.gguf',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/91cad51170dc346986eccefdc2dd33a9da36ead9/qwen2.5-1.5b-instruct-q4_0.gguf',
    sizeBytes: 1066227232,
    sha256: 'dcd819ff094852c38faba6873d8ff0c9d51eadb2844539e52042ae5d647bbfdb',
    minRamGb: 6,
  },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

export function getModel(id: string): ModelInfo | undefined {
  return MODELS.find(model => model.id === id);
}

/** Tamanho legível: 428730208 -> "409 MB", 1066227232 -> "1,0 GB". */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) {
    return `${Math.round(mb)} MB`;
  }
  return `${(mb / 1024).toFixed(1).replace('.', ',')} GB`;
}
