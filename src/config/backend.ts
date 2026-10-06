/**
 * Backend do app (Supabase). A Pluggy é chamada só pelo backend: as
 * credenciais dela ficam lá, nunca no aparelho.
 *
 * Preencha quando o projeto do Supabase existir. A anon key é pública por
 * definição; o acesso aos dados é protegido pelas políticas do Supabase.
 */
export const backendConfig = {
  /** Ex.: https://abcdefgh.supabase.co */
  supabaseUrl: '',
  supabaseAnonKey: '',
  /** Edge Function que busca os dados dos bancos na Pluggy. */
  bankDataFunction: 'bank-data',
};

export const backendConfigured = Boolean(
  backendConfig.supabaseUrl && backendConfig.supabaseAnonKey,
);
