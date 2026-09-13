interface ComingSoonPageProps {
  title: string;
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <section className="empty-state">
      <p className="eyebrow">{title}</p>
      <h2>{t("Coming soon")}</h2>
      <p>{t("This section is reserved for the next CRM phases.")}</p>
    </section>
  );
}
import { t } from "../i18n";
