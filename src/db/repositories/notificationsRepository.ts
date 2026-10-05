import { and, count, desc, eq, isNull, max } from 'drizzle-orm';

import { db } from '../client';
import {
  notificationCaptures,
  type NewNotificationCapture,
  type NotificationCaptureRow,
} from '../notificationSchema';

/** Grava as notificações. Uma que já existe é ignorada, sem duplicar. */
export async function saveNotificationCaptures(
  rows: NewNotificationCapture[],
): Promise<void> {
  for (let i = 0; i < rows.length; i += 40) {
    await db
      .insert(notificationCaptures)
      .values(rows.slice(i, i + 40))
      .onConflictDoNothing({ target: notificationCaptures.id });
  }
}

export type CaptureFilter = {
  /** Só um app, ou todos. */
  packageName?: string | null;
  /** true: só os gastos. false: só as ignoradas. undefined: todas. */
  expense?: boolean;
  limit?: number;
};

export async function listNotificationCaptures({
  packageName,
  expense,
  limit = 300,
}: CaptureFilter = {}): Promise<NotificationCaptureRow[]> {
  return db
    .select()
    .from(notificationCaptures)
    .where(
      and(
        isNull(notificationCaptures.deletedAt),
        packageName
          ? eq(notificationCaptures.packageName, packageName)
          : undefined,
        expense === undefined
          ? undefined
          : eq(notificationCaptures.isExpenseCandidate, expense),
      ),
    )
    .orderBy(desc(notificationCaptures.postedAt))
    .limit(limit);
}

export type CapturedApp = {
  packageName: string;
  appLabel: string;
  total: number;
  expenses: number;
  lastPostedAt: string;
};

/** Apps de onde já veio alguma notificação, com a contagem de cada um. */
export async function listCapturedApps(): Promise<CapturedApp[]> {
  const rows = await db
    .select({
      packageName: notificationCaptures.packageName,
      appLabel: max(notificationCaptures.appLabel),
      candidate: notificationCaptures.isExpenseCandidate,
      total: count(),
      lastPostedAt: max(notificationCaptures.postedAt),
    })
    .from(notificationCaptures)
    .where(isNull(notificationCaptures.deletedAt))
    .groupBy(
      notificationCaptures.packageName,
      notificationCaptures.isExpenseCandidate,
    );

  const apps = new Map<string, CapturedApp>();
  for (const row of rows) {
    const app = apps.get(row.packageName) ?? {
      packageName: row.packageName,
      appLabel: row.appLabel ?? row.packageName,
      total: 0,
      expenses: 0,
      lastPostedAt: '',
    };
    app.total += Number(row.total);
    if (row.candidate) {
      app.expenses += Number(row.total);
    }
    if ((row.lastPostedAt ?? '') > app.lastPostedAt) {
      app.lastPostedAt = row.lastPostedAt ?? '';
    }
    if (row.appLabel) {
      app.appLabel = row.appLabel;
    }
    apps.set(row.packageName, app);
  }
  return [...apps.values()].sort((a, b) =>
    b.lastPostedAt.localeCompare(a.lastPostedAt),
  );
}

/** Apaga as notificações já guardadas de um app, por exemplo ao bloqueá-lo. */
export async function deleteCapturesOf(packageName: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .update(notificationCaptures)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(notificationCaptures.packageName, packageName),
        isNull(notificationCaptures.deletedAt),
      ),
    );
}
