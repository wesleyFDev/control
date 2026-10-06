import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { HttpError } from './http.ts';

/** Cliente com o service role: ignora a RLS. Usar só no servidor. */
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Confere o token do usuário enviado pelo app e devolve o id dele. */
export async function requireUser(
  req: Request,
  admin: SupabaseClient,
): Promise<string> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) {
    throw new HttpError(401, 'Entre na sua conta para continuar.');
  }
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, 'Sessão expirada. Entre de novo.');
  }
  return data.user.id;
}
