/** Só os campos que usamos; o Asaas manda muitos outros. */

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string | null;
  mobilePhone?: string | null;
  externalReference?: string | null;
  deleted?: boolean;
}

export type AsaasSubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED';

export interface AsaasSubscription {
  id: string;
  customer: string;
  status: AsaasSubscriptionStatus;
  billingType: string;
  cycle: string;
  value: number;
  nextDueDate: string;
  description?: string | null;
  externalReference?: string | null;
  deleted?: boolean;
}

export interface AsaasPayment {
  id: string;
  customer: string;
  subscription?: string | null;
  externalReference?: string | null;
  value: number;
  netValue?: number | null;
  billingType: string;
  status: string;
  dueDate: string;
  originalDueDate?: string | null;
  paymentDate?: string | null;
  clientPaymentDate?: string | null;
  invoiceUrl?: string | null;
  transactionReceiptUrl?: string | null;
  deleted?: boolean;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export interface AsaasList<T> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
}

export interface AsaasWebhookEvent {
  id: string;
  event: string;
  dateCreated?: string;
  payment?: AsaasPayment;
}
