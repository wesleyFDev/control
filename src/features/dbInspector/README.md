# Inspetor do banco (ferramenta temporária)

Mostra as tabelas do SQLite local e os dados de cada uma, só para leitura.
A estrutura vem do próprio banco (`sqlite_master` e `PRAGMA table_info`),
então tabelas e colunas novas aparecem sem mudar este código.

## Como remover

1. Apagar a pasta `src/features/dbInspector`.
2. Em `src/navigation/AppDrawer.tsx`, apagar o import e a tela `DbInspector`.
3. Em `src/navigation/DrawerContent.tsx`, apagar o item `DbInspector`.
4. Em `src/navigation/types.ts`, apagar `DbInspector` de `AppDrawerParamList`.
