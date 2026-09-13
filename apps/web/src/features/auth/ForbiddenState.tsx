import { t } from "../../i18n";

export function ForbiddenState() {
  return (
    <section className="error-state">
      <h2>{t("Access denied")}</h2>
      <p>{t("You do not have permission to view this module.")}</p>
    </section>
  );
}
