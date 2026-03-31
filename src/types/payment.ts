export type PaymentStatus = "pending" | "approved" | "rejected";

export interface PaymentRecord {
  id: string;
  userId: string;
  templateId: string;
  provider: "asaas" | "mercado_pago" | "demo";
  amount: number;
  status: PaymentStatus;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt?: string;
}
