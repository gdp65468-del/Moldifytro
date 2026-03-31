"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appBaseUrl = exports.mercadoPagoAccessToken = void 0;
const params_1 = require("firebase-functions/params");
exports.mercadoPagoAccessToken = (0, params_1.defineSecret)("MERCADO_PAGO_ACCESS_TOKEN");
exports.appBaseUrl = (0, params_1.defineSecret)("APP_BASE_URL");
//# sourceMappingURL=config.js.map