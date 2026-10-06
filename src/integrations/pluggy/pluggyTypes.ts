/**
 * Formato das contas e transações da Pluggy, como a Edge Function bank-data
 * repassa. As chamadas à Pluggy ficam no backend: supabase/functions.
 */

export type PluggyAccount = {
  id: string;
  itemId: string;
  name: string;
  marketingName?: string | null;
  type: 'BANK' | 'CREDIT' | string;
  subtype: string;
  number: string;
  balance: number;
  currencyCode: string;
  /** Só nos cartões. */
  creditData?: {
    creditLimit?: number | null;
    availableCreditLimit?: number | null;
    balanceCloseDate?: string | null;
    balanceDueDate?: string | null;
  } | null;
};

export type PluggyTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currencyCode: string;
  type: 'DEBIT' | 'CREDIT';
  status: 'PENDING' | 'POSTED';
  category?: string | null;
  operationType?: string | null;
  creditCardMetadata?: {
    installmentNumber?: number;
    totalInstallments?: number;
  } | null;
};
