"use strict";

const assert = require("node:assert");
const crypto = require("node:crypto");
const { UsdpayClient, verifyWebhookSignature } = require("../sdk/node");

async function run() {
  const rawBody = Buffer.from(JSON.stringify({ event: "invoice.paid", invoiceId: "inv_example" }));
  const secret = "whsec_example";
  const signature = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  assert.equal(verifyWebhookSignature(rawBody, signature, secret), true);
  assert.equal(verifyWebhookSignature(rawBody, "sha256=invalid", secret), false);

  let request;
  const client = new UsdpayClient({
    secretKey: "sk_example",
    fetch: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 201,
        headers: { get: () => null },
        text: async () => JSON.stringify({ id: "inv_example", checkoutUrl: "https://usdpay.me/pay/inv_example" }),
      };
    },
  });

  const invoice = await client.createInvoice(
    { amount: "49.00", orderId: "ORDER-1044" },
    { idempotencyKey: "order-1044" }
  );
  assert.equal(invoice.id, "inv_example");
  assert.equal(request.url, "https://usdpay.me/api/invoices");
  assert.equal(request.options.headers.Authorization, "Bearer sk_example");
  assert.equal(request.options.headers["Idempotency-Key"], "order-1044");
  assert.equal(JSON.parse(request.options.body).amount, "49.00");

  console.log("USDPAY public SDK tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
