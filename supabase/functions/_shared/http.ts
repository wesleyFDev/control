export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Responde o erro como JSON `{ error }`, que o app mostra ao usuário. */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: error.message }, error.status);
  }
  console.error(error);
  return json({ error: 'Erro inesperado no servidor.' }, 500);
}
