"use strict";

const crypto = require("node:crypto");

const SDK_VERSION = "1.0.0";
const DEFAULT_BASE_URL = "https://usdpay.me";
const DEFAULT_TIMEOUT_MS = 10_000;

class UsdpayApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "UsdpayApiError";
    this.status = Number(options.status || 0);
    this.code = String(options.code || "request_failed");
    this.details = options.details || null;
    this.retryAfter = options.retryAfter == null ? null : Number(options.retryAfter);
    if (options.cause) this.cause = options.cause;
  }
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function requiredText(value, name) {
  const text = String(value || "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function verifyWebhookSignature(rawBody, signature, secret) {
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""));
  const received = String(signature || "").trim();
  const signingSecret = requiredText(secret, "webhook secret");
  const expected = `sha256=${crypto.createHmac("sha256", signingSecret).update(body).digest("hex")}`;
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

class UsdpayClient {
  constructor(options = {}) {
    if (typeof options === "string") options = { secretKey: options };
    this.secretKey = requiredText(options.secretKey, "secretKey");
    this.baseUrl = String(options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = Math.max(1, Number(options.timeoutMs || DEFAULT_TIMEOUT_MS));
    this.fetch = options.fetch || globalThis.fetch;
    if (typeof this.fetch !== "function") {
      throw new TypeError("A fetch implementation is required (Node.js 18 or newer)");
    }
  }

  async request(pathname, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const externalSignal = options.signal;
    const abort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", abort, { once: true });
    }

    const headers = {
      Accept: "application/json",
      "User-Agent": `usdpay-node/${SDK_VERSION}`,
      ...(options.auth === false ? {} : { Authorization: `Bearer ${this.secretKey}` }),
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    };

    try {
      const response = await this.fetch(`${this.baseUrl}${pathname}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });
      const raw = await response.text();
      let data = {};
      if (raw) {
        try {
          data = JSON.parse(raw);
        } catch (error) {
          throw new UsdpayApiError("USDPAY returned invalid JSON", {
            status: response.status,
            code: "invalid_response",
            details: { raw: raw.slice(0, 500) },
            cause: error,
          });
        }
      }
      if (!response.ok) {
        throw new UsdpayApiError(data.error || `USDPAY request failed with HTTP ${response.status}`, {
          status: response.status,
          code: data.error || "request_failed",
          details: data,
          retryAfter: response.headers && response.headers.get("retry-after"),
        });
      }
      return data;
    } catch (error) {
      if (error instanceof UsdpayApiError) throw error;
      const timedOut = controller.signal.aborted && !(externalSignal && externalSignal.aborted);
      throw new UsdpayApiError(timedOut ? "USDPAY request timed out" : "Could not reach USDPAY", {
        code: timedOut ? "request_timeout" : "network_error",
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      if (externalSignal) externalSignal.removeEventListener("abort", abort);
    }
  }

  async createInvoice(params = {}, options = {}) {
    if (params.amount == null || String(params.amount).trim() === "") {
      throw new TypeError("amount is required");
    }
    const idempotencyKey = options.idempotencyKey || params.idempotencyKey;
    const body = compactObject({
      amount: params.amount,
      orderId: params.orderId,
      network: params.network,
      expiresInMinutes: params.expiresInMinutes,
      callbackUrl: params.callbackUrl,
      returnUrl: params.returnUrl,
    });
    return this.request("/api/invoices", {
      method: "POST",
      body,
      signal: options.signal,
      headers: idempotencyKey ? { "Idempotency-Key": String(idempotencyKey) } : {},
    });
  }

  async listInvoices(options = {}) {
    return this.request("/api/invoices", { signal: options.signal });
  }

  async getInvoice(invoiceId, options = {}) {
    const id = requiredText(invoiceId, "invoiceId");
    return this.request(`/api/invoices/${encodeURIComponent(id)}`, {
      auth: false,
      signal: options.signal,
    });
  }
}

module.exports = {
  SDK_VERSION,
  UsdpayApiError,
  UsdpayClient,
  verifyWebhookSignature,
};
