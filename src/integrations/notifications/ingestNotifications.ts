import { aiLog as log } from '../../ai/aiLog';
import { saveNotificationCaptures } from '../../db/repositories/notificationsRepository';
import type { NewNotificationCapture } from '../../db/notificationSchema';
import { toISODate } from '../../utils/dates';
import {
  bankNotifications,
  type RawBankNotification,
} from './bankNotifications';
import { parseNotification } from './parseNotification';

export function toCaptureRow(
  raw: RawBankNotification,
  now: string,
): NewNotificationCapture {
  const parsed = parseNotification(raw.title, raw.text);
  const posted = new Date(raw.postedAt);
  return {
    id: `${raw.packageName}:${raw.key}:${raw.postedAt}`,
    packageName: raw.packageName,
    appLabel: raw.appLabel ?? null,
    matchedBy: raw.matchedBy ?? null,
    title: raw.title,
    text: raw.text,
    postedAt: posted.toISOString(),
    date: toISODate(posted),
    amountCents: parsed.amountCents,
    merchant: parsed.expense ? parsed.merchant : null,
    categoryId: parsed.expense ? parsed.categoryId : null,
    isExpenseCandidate: parsed.expense,
    ignoreReason: parsed.expense ? null : parsed.reason,
    createdAt: now,
    updatedAt: now,
  };
}

let running: Promise<number> | null = null;

/**
 * Move as notificações da fila do serviço nativo para o banco.
 * Roda ao abrir o app e ao voltar para ele. Devolve quantas chegaram.
 */
export function ingestBankNotifications(): Promise<number> {
  if (running) {
    return running;
  }
  running = (async () => {
    const raw = await bankNotifications.drainQueue();
    if (raw.length === 0) {
      return 0;
    }
    const now = new Date().toISOString();
    const rows = raw.map(item => toCaptureRow(item, now));
    await saveNotificationCaptures(rows);
    log(
      `notificações: ${rows.length} recebida(s), ${
        rows.filter(r => r.isExpenseCandidate).length
      } parecem gastos`,
    );
    return rows.length;
  })().finally(() => {
    running = null;
  });
  return running;
}
