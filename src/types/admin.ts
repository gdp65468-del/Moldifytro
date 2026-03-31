import type { PaymentStatus } from "@/types/payment";
import type { TemplateMode, TemplateStatus } from "@/types/template";

export interface AdminAccess {
  uid: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface AdminOverview {
  totalUsers: number;
  totalTemplates: number;
  publishedTemplates: number;
  totalViews: number;
  totalDownloads: number;
  approvedPayments: number;
  pendingOrFailedPayments: number;
  revenueTotal: number;
  recentTemplates: AdminTemplateRow[];
}

export interface AdminTemplateRow {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  title: string;
  templateMode: TemplateMode;
  status: TemplateStatus;
  isPublic: boolean;
  shareSlug?: string;
  thumbnailUrl?: string;
  viewsCount: number;
  downloadsCount: number;
  updatedAt: string;
  deletedAt?: string | null;
  purgeAt?: string | null;
  isTrashed: boolean;
}

export interface AdminPaymentRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  templateId: string;
  templateTitle: string;
  amount: number;
  status: PaymentStatus;
  provider: string;
  createdAt: string;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  templatesCount: number;
  publishedTemplatesCount: number;
  totalDownloads: number;
  createdAt: string;
}

export interface AdminTemplateFilters {
  search?: string;
  status?: TemplateStatus | "all";
  mode?: TemplateMode | "all";
  visibility?: "all" | "public" | "private";
  trash?: "active" | "trash" | "all";
}

export interface AdminPaymentFilters {
  search?: string;
  status?: PaymentStatus | "all";
}
