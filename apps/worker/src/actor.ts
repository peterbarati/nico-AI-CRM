export interface DemoActorEnv {
  DEMO_CUSTOMER_SERVICE_USER_ID?: string;
  DEMO_SALES_USER_ID?: string;
}

export function getCustomerServiceActorId(env: DemoActorEnv): string {
  return env.DEMO_CUSTOMER_SERVICE_USER_ID ?? "usr-cs-001";
}

export function getSalesActorId(env: DemoActorEnv): string {
  return env.DEMO_SALES_USER_ID ?? "usr-sales-002";
}
