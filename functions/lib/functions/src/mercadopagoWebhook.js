"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mercadopagoWebhook = exports.asaasWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const config_1 = require("./config");
function mapAsaasStatusToLocal(status) {
    const normalized = (status ?? "").toUpperCase();
    if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "OVERDUE_RECEIVED", "REFUNDED_PARTIALLY"].includes(normalized)) {
        return "approved";
    }
    if (["REFUNDED", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "CHARGEBACK_REVERSED", "DELETED", "CANCELED"].includes(normalized)) {
        return "rejected";
    }
    return "pending";
}
async function findLatestAsaasPaymentDoc(payload) {
    const paymentId = payload.payment?.id;
    const checkoutId = payload.checkout?.id ?? payload.payment?.checkoutSession;
    const templateId = payload.payment?.externalReference ?? payload.checkout?.externalReference;
    if (paymentId) {
        const byPaymentId = await admin_1.adminDb
            .collection("payments")
            .where("provider", "==", "asaas")
            .where("asaasPaymentId", "==", paymentId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        if (!byPaymentId.empty) {
            return byPaymentId.docs[0];
        }
    }
    if (checkoutId) {
        const byCheckoutId = await admin_1.adminDb
            .collection("payments")
            .where("provider", "==", "asaas")
            .where("asaasCheckoutId", "==", checkoutId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        if (!byCheckoutId.empty) {
            return byCheckoutId.docs[0];
        }
    }
    if (templateId) {
        const byTemplate = await admin_1.adminDb
            .collection("payments")
            .where("provider", "==", "asaas")
            .where("templateId", "==", templateId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        if (!byTemplate.empty) {
            return byTemplate.docs[0];
        }
    }
    return undefined;
}
exports.asaasWebhook = (0, https_1.onRequest)({ secrets: [config_1.asaasApiKey] }, async (request, response) => {
    try {
        const payload = (request.body ?? {});
        const latest = await findLatestAsaasPaymentDoc(payload);
        if (!latest) {
            response.status(200).send("ignored");
            return;
        }
        const nextStatus = mapAsaasStatusToLocal(payload.payment?.status ?? payload.checkout?.status);
        await latest.ref.set({
            status: nextStatus,
            updatedAt: new Date().toISOString(),
            asaasPaymentId: payload.payment?.id,
            asaasEvent: payload.event,
        }, { merge: true });
        response.status(200).send("ok");
    }
    catch (error) {
        console.error(error);
        response.status(500).send("error");
    }
});
// Alias para evitar quebrar webhooks antigos que ainda apontam para o endpoint legado.
exports.mercadopagoWebhook = exports.asaasWebhook;
//# sourceMappingURL=mercadopagoWebhook.js.map