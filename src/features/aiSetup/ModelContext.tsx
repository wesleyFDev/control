import React, { createContext, useContext } from 'react';

import type { ModelStatus } from '../../ai/models/modelManager';

type ModelContextValue = {
  status: ModelStatus;
  setStatus: (status: ModelStatus) => void;
};

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({
  value,
  children,
}: {
  value: ModelContextValue;
  children: React.ReactNode;
}) {
  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
}

/** Situação do modelo de IA, para qualquer tela saber se ele está pronto. */
export function useModelStatus(): ModelContextValue {
  const value = useContext(ModelContext);
  if (!value) {
    throw new Error('useModelStatus precisa estar dentro do ModelGate.');
  }
  return value;
}
