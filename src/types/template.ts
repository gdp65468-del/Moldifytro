export type TemplateMode = "full_frame" | "overlay_logo";
export type TemplateStatus = "draft" | "pending_payment" | "published";

export type TextAlign = "left" | "center" | "right";

export interface OverlayLayerConfig {
  x: number;
  y: number;
  scale: number;
  widthRatio: number;
}

export interface TextOverlayConfig {
  text: string;
  x: number;
  y: number;
  widthRatio: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
  align: TextAlign;
  shadowEnabled: boolean;
  strokeEnabled: boolean;
}

export interface OverlayConfig {
  overlay?: OverlayLayerConfig;
  text?: TextOverlayConfig;
  publicTextEditable?: boolean;
}

export interface PlatformTemplate {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  thumbnailUrl: string;
  templateMode: "full_frame";
  isActive: boolean;
  viewsCount: number;
  downloadsCount: number;
  createdAt: string;
}

export interface UserTemplate {
  id: string;
  ownerId: string;
  title: string;
  templateMode: TemplateMode;
  frameUrl: string;
  frameStoragePath?: string;
  thumbnailUrl?: string;
  status: TemplateStatus;
  isPublic: boolean;
  publishUnlocked: boolean;
  shareSlug?: string;
  usesCount: number;
  viewsCount: number;
  downloadsCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  pricePaid?: number | null;
  source: "custom" | "platform";
  platformTemplateId?: string;
  overlayConfig?: OverlayConfig;
  deletedAt?: string | null;
  purgeAt?: string | null;
}

export interface TemplateUse {
  id: string;
  templateId: string;
  usedBy: string;
  action: "view" | "download";
  createdAt: string;
}

export interface TemplateDraftInput {
  id?: string;
  ownerId: string;
  title: string;
  templateMode: TemplateMode;
  frameUrl: string;
  frameStoragePath?: string;
  thumbnailUrl?: string;
  overlayConfig?: OverlayConfig;
  source?: "custom" | "platform";
  platformTemplateId?: string;
}
