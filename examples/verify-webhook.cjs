"use strict";

const { verifyWebhookSignature } = require("../sdk/node");

function verifyUsdpayWebhook({ rawBody, headers, webhookSecret }) {
  const signature = headers["x-usdpay-signature"];
  const idempotencyKey = headers["x-usdpay-idempotency-key"];

  if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    throw new Error("Invalid USDPAY webhook signature");
  }
  if (!idempotencyKey) {
    throw new Error("Missing USDPAY webhook idempotency key");
  }

  const event = JSON.parse(Buffer.from(rawBody).toString("utf8"));
  return { event, idempotencyKey };
}

module.exports = { verifyUsdpayWebhook };
