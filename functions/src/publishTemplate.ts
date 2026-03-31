import { HttpsError, onCall } from "firebase-functions/v2/https";
import { adminDb } from "./admin";
import { buildSlug } from "./helpers";

export const publishTemplate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login necessario.");
  }

  const templateId = String(request.data?.templateId ?? "");
  if (!templateId) {
    throw new HttpsError("invalid-argument", "templateId obrigatorio.");
  }

  const templateRef = adminDb.collection("user_templates").doc(templateId);
  const templateSnapshot = await templateRef.get();

  if (!templateSnapshot.exists) {
    throw new HttpsError("not-found", "Template nao encontrado.");
  }

  const template = templateSnapshot.data();
  if (template?.ownerId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Template pertence a outro usuario.");
  }

  const payments = await adminDb
    .collection("payments")
    .where("templateId", "==", templateId)
    .where("userId", "==", request.auth.uid)
    .where("status", "==", "approved")
    .limit(1)
    .get();

  if (payments.empty) {
    throw new HttpsError("failed-precondition", "Pagamento ainda nao aprovado.");
  }

  const slugBase = buildSlug(String(template?.title ?? "template"));
  let slug = slugBase;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const existing = await adminDb
      .collection("user_templates")
      .where("shareSlug", "==", slug)
      .limit(1)
      .get();

    if (existing.empty || existing.docs[0]?.id === templateId) {
      break;
    }

    slug = buildSlug(String(template?.title ?? "template"), Math.random().toString(36).slice(2, 6));
  }

  const published = {
    ...template,
    status: "published",
    isPublic: true,
    publishUnlocked: true,
    shareSlug: slug,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pricePaid: 5.9,
  };

  await templateRef.set(published, { merge: true });

  return {
    template: {
      id: templateId,
      ...published,
    },
  };
});
