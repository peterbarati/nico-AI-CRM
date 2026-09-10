export interface OrderSummary {
  id: string;
  externalId: string | null;
  customerId: string;
  customerLocationId: string | null;
  orderNumber: string;
  orderDate: string;
  netAmount: number;
  grossAmount: number;
  currency: string;
  status: string;
  source: string;
}

export interface OrderRow {
  id: string;
  external_id: string | null;
  customer_id: string;
  customer_location_id: string | null;
  order_number: string;
  order_date: string;
  net_amount: number;
  gross_amount: number;
  currency: string;
  status: string;
  source: string;
}
