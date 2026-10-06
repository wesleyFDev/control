/**
 * Credenciais da Pluggy do usuário.
 *
 * GET    → { configured, updatedAt }   (nunca devolve as credenciais)
 * POST   { clientId, clientSecret } → testa na Pluggy, cifra e grava.
 * DELETE → apaga.
 */
import { adminClient, requireUser } from '../_shared/auth.ts';
import { encrypt } from '../_shared/crypto.ts';
import { errorResponse, HttpError, json } from '../_shared/http.ts';
import { createApiKey, PluggyError } from '../_shared/pluggy.ts';

Deno.serve(async req => {
  try {
    const admin = adminClient();
    const userId = await requireUser(req, admin);

    if (req.method === 'GET') {
      const { data, error } = await admin
        .from('pluggy_credentials')
        .select('updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return json({
        configured: Boolean(data),
        updatedAt: data?.updated_at ?? null,
      });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      const clientId = String(body?.clientId ?? '').trim();
      const clientSecret = String(body?.clientSecret ?? '').trim();
      if (!clientId || !clientSecret) {
        throw new HttpError(400, 'Informe o Client ID e o Client Secret.');
      }
      // Só grava se a Pluggy aceitar.
      try {
        await createApiKey({ clientId, clientSecret });
      } catch (error) {
        if (error instanceof PluggyError) {
          throw new HttpError(400, error.message);
        }
        throw error;
      }
      const sealed = await encrypt(JSON.stringify({ clientId, clientSecret }));
      const { error } = await admin.from('pluggy_credentials').upsert({
        user_id: userId,
        ...sealed,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        throw error;
      }
      return json({ configured: true });
    }

    if (req.method === 'DELETE') {
      const { error } = await admin
        .from('pluggy_credentials')
        .delete()
        .eq('user_id', userId);
      if (error) {
        throw error;
      }
      return json({ configured: false });
    }

    throw new HttpError(405, 'Método não suportado.');
  } catch (error) {
    return errorResponse(error);
  }
});
