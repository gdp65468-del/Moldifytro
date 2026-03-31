"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mercadopagoWebhook = void 0;
const mercadopago_1 = require("mercadopago");
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const config_1 = require("./config");
exports.mercadopagoWebhook = (0, https_1.onRequest)({ secrets: [config_1.mercadoPagoAccessToken] }, async (request, response) => {
    try {
        const paymentId = String(request.query["data.id"] ?? request.body?.data?.id ?? "");
        if (!paymentId) {
            response.status(200).send("ignored");
            return;
        }
        const client = new mercadopago_1.MercadoPagoConfig({
            accessToken: config_1.mercadoPagoAccessToken.value(),
        });
        const paymentApi = new mercadopago_1.Payment(client);
        const payment = await paymentApi.get({ id: paymentId });
        const templateId = String(payment.external_reference ?? "");
        if (!templateId) {
            response.status(200).send("missing_reference");
            return;
        }
        const payments = await admin_1.adminDb
            .collection("payments")
            .where("templateId", "==", templateId)
            .orderBy("createdAt", "desc")
            .limit(1)
            .get();
        const latest = payments.docs[0];
        if (latest) {
            await latest.ref.set({
                status: payment.status === "approved" ? "approved" : payment.status ?? "pending",
                updatedAt: new Date().toISOString(),
                paymentId,
            }, { merge: true });
        }
        response.status(200).send("ok");
    }
    catch (error) {
        console.error(error);
        response.status(500).send("error");
    }
});
//# sourceMappingURL=mercadopagoWebhook.js.map