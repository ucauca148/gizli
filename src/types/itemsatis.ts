export interface ItemSatisWebhookPayload {
  event_type?: string;
  type?: string;
  action?: string;
  data?: any;
  [key: string]: any; // Esnek yapı için
}

export interface ParsedProductData {
  itemsatisProductId: string;
  title: string;
  price: number;
  quantity: number;
}

export interface ParsedOrderData {
  itemsatisOrderId: string;
  storeCode?: string; // Query param veya Payload'dan gelen 2 mağaza ayrım kodu
  totalAmount: number;
  status: "PENDING" | "APPROVED" | "CANCELLED";
  products: ParsedProductData[];
  /** Webhook işlendiği an değil; ItemSatis’in bildirdiği satış zamanı (unix sn → Date) */
  occurredAt?: Date;
}

export interface DashboardSummaryResponse {
  todaySalesCount: number;
  todayApprovedCount: number;
  todayCancelledCount: number;
  todayRevenue: number;
  last7DaysChart: {
    date: string;       // "YYYY-MM-DD"
    salesCount: number; // Toplam satış adedi
    revenue: number;    // Toplam getiri
  }[];
}
