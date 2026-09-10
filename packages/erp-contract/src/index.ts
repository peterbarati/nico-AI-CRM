export type ERPProviderName = "mock" | "money-s4";

export interface ERPProviderError {
  code: "NOT_IMPLEMENTED" | "UNAVAILABLE" | "INVALID_RESPONSE";
  message: string;
}

export type ERPProviderResult<T> =
  | {
      ok: true;
      data: T;
      nextCursor?: string;
    }
  | {
      ok: false;
      error: ERPProviderError;
    };

export interface ERPIncrementalQuery {
  updatedSince?: Date;
  cursor?: string;
  limit?: number;
}

export interface ERPCustomerImport {
  externalId: string;
  displayName: string;
  email?: string;
  phone?: string;
  companyRegistrationNumber?: string;
  taxRegistrationNumber?: string;
  updatedAt: string;
}

export interface ERPOrderImport {
  externalId: string;
  customerExternalId: string;
  orderNumber: string;
  orderedAt: string;
  currency: string;
  totalNetAmount: number;
  updatedAt: string;
  items: ERPOrderItemImport[];
}

export interface ERPOrderItemImport {
  externalId: string;
  productExternalId: string;
  productName: string;
  quantity: number;
  unitNetAmount: number;
  totalNetAmount: number;
}

export interface ERPProvider {
  readonly name: ERPProviderName;
  getCustomers(query?: ERPIncrementalQuery): Promise<ERPProviderResult<ERPCustomerImport[]>>;
  getCustomersUpdatedSince(updatedSince: Date): Promise<ERPProviderResult<ERPCustomerImport[]>>;
  getCustomerByExternalId(externalId: string): Promise<ERPProviderResult<ERPCustomerImport | null>>;
  getOrders(query?: ERPIncrementalQuery): Promise<ERPProviderResult<ERPOrderImport[]>>;
  getOrdersUpdatedSince(updatedSince: Date): Promise<ERPProviderResult<ERPOrderImport[]>>;
}

const demoCustomers: ERPCustomerImport[] = [
  {
    externalId: "demo-customer-1",
    displayName: "NICO Demo Customer",
    email: "demo@example.com",
    phone: "+421900000000",
    companyRegistrationNumber: "12345678",
    taxRegistrationNumber: "SK1234567890",
    updatedAt: "2026-01-01T00:00:00.000Z"
  }
];

const demoOrders: ERPOrderImport[] = [
  {
    externalId: "demo-order-1",
    customerExternalId: "demo-customer-1",
    orderNumber: "DEMO-2026-001",
    orderedAt: "2026-01-05T09:00:00.000Z",
    currency: "EUR",
    totalNetAmount: 120,
    updatedAt: "2026-01-05T09:05:00.000Z",
    items: [
      {
        externalId: "demo-order-1-item-1",
        productExternalId: "demo-product-1",
        productName: "Demo Product",
        quantity: 2,
        unitNetAmount: 60,
        totalNetAmount: 120
      }
    ]
  }
];

function updatedAfter<T extends { updatedAt: string }>(records: T[], updatedSince?: Date): T[] {
  if (!updatedSince) {
    return records;
  }

  return records.filter((record) => new Date(record.updatedAt) > updatedSince);
}

export class MockERPProvider implements ERPProvider {
  readonly name = "mock";

  async getCustomers(
    query: ERPIncrementalQuery = {}
  ): Promise<ERPProviderResult<ERPCustomerImport[]>> {
    return {
      ok: true,
      data: updatedAfter(demoCustomers, query.updatedSince)
    };
  }

  async getCustomersUpdatedSince(
    updatedSince: Date
  ): Promise<ERPProviderResult<ERPCustomerImport[]>> {
    return this.getCustomers({ updatedSince });
  }

  async getCustomerByExternalId(
    externalId: string
  ): Promise<ERPProviderResult<ERPCustomerImport | null>> {
    return {
      ok: true,
      data: demoCustomers.find((customer) => customer.externalId === externalId) ?? null
    };
  }

  async getOrders(query: ERPIncrementalQuery = {}): Promise<ERPProviderResult<ERPOrderImport[]>> {
    return {
      ok: true,
      data: updatedAfter(demoOrders, query.updatedSince)
    };
  }

  async getOrdersUpdatedSince(updatedSince: Date): Promise<ERPProviderResult<ERPOrderImport[]>> {
    return this.getOrders({ updatedSince });
  }
}

export class MoneyS4Provider implements ERPProvider {
  readonly name = "money-s4";

  async getCustomers(): Promise<ERPProviderResult<ERPCustomerImport[]>> {
    return this.notImplemented();
  }

  async getCustomersUpdatedSince(): Promise<ERPProviderResult<ERPCustomerImport[]>> {
    return this.notImplemented();
  }

  async getCustomerByExternalId(): Promise<ERPProviderResult<ERPCustomerImport | null>> {
    return this.notImplemented();
  }

  async getOrders(): Promise<ERPProviderResult<ERPOrderImport[]>> {
    return this.notImplemented();
  }

  async getOrdersUpdatedSince(): Promise<ERPProviderResult<ERPOrderImport[]>> {
    return this.notImplemented();
  }

  private async notImplemented<T>(): Promise<ERPProviderResult<T>> {
    return {
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Money S4 ERP provider belongs to Phase 2 and has no connection logic yet."
      }
    };
  }
}
