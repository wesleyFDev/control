let counter = 0;

/** Identificador local para mensagens e rascunhos. Não serve para o banco. */
export function createLocalId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
