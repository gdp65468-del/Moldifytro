"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckout = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const config_1 = require("./config");
async function createAsaasCheckout(body) {
    const response = await fetch(`${config_1.asaasApiBaseUrl.value()}/checkouts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            access_token: config_1.asaasApiKey.value(),
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new https_1.HttpsError("internal", `Asaas checkout falhou: ${errorBody.slice(0, 220)}`);
    }
    return (await response.json());
}
exports.createCheckout = (0, https_1.onCall)({ secrets: [config_1.asaasApiKey, config_1.appBaseUrl] }, async (request) => {
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
    const userSnapshot = await admin_1.adminDb.collection("users").doc(request.auth.uid).get();
    const userData = userSnapshot.data();
    const baseUrl = config_1.appBaseUrl.value();
    const checkout = await createAsaasCheckout({
        billingTypes: ["PIX", "CREDIT_CARD"],
        chargeTypes: ["DETACHED"],
        externalReference: templateId,
        items: [
            {
                name: `Publicacao do template ${template?.title ?? templateId}`,
                quantity: 1,
                value: 5.9,
            },
        ],
        callback: {
            successUrl: `${baseUrl}/publish/${templateId}`,
            autoRedirect: true,
        },
        customerData: {
            name: userData?.name,
            email: userData?.email,
        },
    });
    const paymentRecord = {
        userId: request.auth.uid,
        templateId,
        provider: "asaas",
        amount: 5.9,
        status: "pending",
        checkoutUrl: checkout.url ?? (checkout.id ? `${config_1.asaasApiBaseUrl.value()}/checkout/${checkout.id}` : undefined),
        asaasCheckoutId: checkout.id,
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