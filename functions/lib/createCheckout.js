"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckout = void 0;
const mercadopago_1 = require("mercadopago");
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const config_1 = require("./config");
exports.createCheckout = (0, https_1.onCall)({ secrets: [config_1.mercadoPagoAccessToken, config_1.appBaseUrl] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Login necessario.");
    }
    const templateId = String(request.data?.templateId ?? "");
    if (!templateId) {
        throw new https_1.HttpsError("invalid-argument", "templateId obrigatorio.");
    }
    const templateRef = admin_1.adminDb.collection("user_templates").doc(templateId);
    const templateSnapshot = await templateRef.get();
    if (!templateSnapshot.exists) {
        throw new https_1.HttpsError("not-found", "Template nao encontrado.");
    }
    const template = templateSnapshot.data();
    if (template?.ownerId !== request.auth.uid) {
        throw new https_1.HttpsError("permission-denied", "Voce nao pode iniciar checkout para este template.");
    }
    const client = new mercadopago_1.MercadoPagoConfig({
        accessToken: config_1.mercadoPagoAccessToken.value(),
    });
    const preference = new mercadopago_1.Preference(client);
    const baseUrl = config_1.appBaseUrl.value();
    const response = await preference.create({
        body: {
            external_reference: templateId,
            items: [
                {
                    id: templateId,
                    title: `Publicacao do template ${template?.title ?? templateId}`,
                    quantity: 1,
                    unit_price: 5.9,
                    currency_id: "BRL",
                },
            ],
            back_urls: {
                success: `${baseUrl}/publish/${templateId}`,
                pending: `${baseUrl}/publish/${templateId}`,
                failure: `${baseUrl}/checkout/${templateId}`,
            },
        },
    });
    const paymentRecord = {
        userId: request.auth.uid,
        templateId,
        provider: "mercado_pago",
        amount: 5.9,
        status: "pending",
        checkoutUrl: response.init_point,
        preferenceId: response.id,
        createdAt: new Date().toISOString(),
    };
    const paymentRef = await admin_1.adminDb.collection("payments").add(paymentRecord);
    return {
        payment: {
            id: paymentRef.id,
            ...paymentRecord,
        },
    };
});
//# sourceMappingURL=createCheckout.js.map