import type { Edge } from 'react-native-safe-area-context';

/**
 * Bordas protegidas pelo SafeAreaView na raiz de cada tela.
 *
 * - Telas com o cabeçalho do navegador (drawer ou stack): o cabeçalho já
 *   ocupa a área da barra de status, então o topo fica de fora para não
 *   somar o espaço duas vezes.
 * - Telas sem cabeçalho, como o chat: todas as bordas.
 */
export const EDGES_WITH_HEADER: Edge[] = ['left', 'right', 'bottom'];
export const EDGES_WITHOUT_HEADER: Edge[] = ['top', 'left', 'right', 'bottom'];
