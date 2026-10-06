import { requireSupabase } from './supabase';

function message(error: { message: string; code?: string }): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed':
      return 'Confirme o e-mail pelo link que enviamos antes de entrar.';
    case 'user_already_exists':
      return 'Já existe uma conta com este e-mail.';
    case 'weak_password':
      return 'Senha fraca. Use pelo menos 6 caracteres.';
    default:
      return error.message;
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) {
    throw new Error(message(error));
  }
}

/**
 * Cria a conta. Devolve `needsConfirmation` quando o projeto exige confirmar
 * o e-mail antes do primeiro login.
 */
export async function signUp(
  displayName: string,
  email: string,
  password: string,
): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await requireSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim() } },
  });
  if (error) {
    throw new Error(message(error));
  }
  return { needsConfirmation: !data.session };
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut();
  if (error) {
    throw new Error(message(error));
  }
}
