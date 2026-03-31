import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError, CallableRequest } from "firebase-functions/v2/https";

const app = getApps()[0] ?? initializeApp();

export const adminDb = getFirestore(app);

export async function assertAdmin(request: CallableRequest<unknown>) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login necessario.");
  }

  const access = await adminDb.collection("admin_access").doc(request.auth.uid).get();
  if (!access.exists || access.data()?.active !== true) {
    throw new HttpsError("permission-denied", "Acesso admin necessario.");
  }

  return request.auth.uid;
}
