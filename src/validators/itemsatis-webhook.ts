/**
 * İtemSatış webhook payload'ı için savunmacı normalleştirme (daha önce Zod ile yapılıyordu;
 * Next.js/Vercel webpack bazı Zod sürümlerinde "Cannot get final name for export 'z'" verdiği
 * için eşdeğer mantık burada tutuluyor).
 */

export type ValidatedWebhookPayload = Record<string, unknown> & {
  event_type?: string;
  type?: string;
  action?: string;
  status?: string;
  order_id?: string;
  store_id?: string;
  amount?: number;
  products?: unknown[];
  /** İç içe sipariş alanları için (Zod `.data` ile aynı esneklik) */
  data?: Record<string, unknown>;
  _injected_store_code?: string;
};

function normalizeStringField(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

export function parseWebhookPayload(raw: unknown): ValidatedWebhookPayload {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) {
    return {} as ValidatedWebhookPayload;
  }

  const src = raw as Record<string, unknown>;
  const out = { ...src } as ValidatedWebhookPayload;

  if ("order_id" in src && src.order_id !== undefined && src.order_id !== null) {
    out.order_id = String(src.order_id);
  }

  if ("store_id" in src && src.store_id !== undefined && src.store_id !== null) {
    out.store_id = String(src.store_id);
  }

  if ("amount" in src && src.amount !== undefined) {
    const n = Number(src.amount as number | string);
    out.amount = Number.isFinite(n) ? n : 0;
  }

  if ("products" in src && src.products !== undefined) {
    out.products = Array.isArray(src.products) ? src.products : [];
  }

  for (const key of ["event_type", "type", "action", "status", "_injected_store_code"] as const) {
    if (key in src && src[key] !== undefined && src[key] !== null) {
      out[key] = normalizeStringField(src[key]) as ValidatedWebhookPayload[typeof key];
    }
  }

  if (
    "data" in src &&
    src.data !== undefined &&
    src.data !== null &&
    typeof src.data === "object" &&
    !Array.isArray(src.data)
  ) {
    out.data = { ...(src.data as Record<string, unknown>) };
  }

  return out;
}

/** Zod API ile uyumlu: yalnızca `parse` kullanılıyor. */
export const WebhookPayloadSchema = {
  parse: parseWebhookPayload,
};
