interface CustomerServiceErrorStateProps {
  message: string;
}

export function CustomerServiceErrorState({ message }: CustomerServiceErrorStateProps) {
  return (
    <section className="error-state">
      <h2>{t("Customer Service API error")}</h2>
      <p>{message}</p>
    </section>
  );
}
import { t } from "../../i18n";
