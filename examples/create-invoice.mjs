const secretKey = process.env.USDPAY_SECRET_KEY;

if (!secretKey) {
  throw new Error("Set USDPAY_SECRET_KEY in the server environment");
}

const orderId = `ORDER-${Date.now()}`;
const response = await fetch("https://usdpay.me/api/invoices", {
  method: "POST",
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
    "Idempotency-Key": orderId,
  },
  body: JSON.stringify({
    amount: "49.00",
    orderId,
    callbackUrl: "https://merchant.example/usdpay/webhook",
    returnUrl: `https://merchant.example/orders/${encodeURIComponent(orderId)}`,
  }),
});

const invoice = await response.json();

if (!response.ok) {
  throw new Error(invoice.error || `USDPAY returned HTTP ${response.status}`);
}

console.log({
  invoiceId: invoice.id,
  status: invoice.status,
  checkoutUrl: invoice.checkoutUrl,
});
