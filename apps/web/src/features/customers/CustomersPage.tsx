import { CustomerDetailPage } from "./CustomerDetailPage";
import { CustomerListPage } from "./CustomerListPage";

interface CustomersPageProps {
  customerId?: string;
  onNavigate: (path: string) => void;
}

export function CustomersPage({ customerId, onNavigate }: CustomersPageProps) {
  if (customerId) {
    return (
      <CustomerDetailPage
        customerId={decodeURIComponent(customerId)}
        onBack={() => onNavigate("/customers")}
      />
    );
  }

  return <CustomerListPage onOpenCustomer={(id) => onNavigate(`/customers/${id}`)} />;
}
