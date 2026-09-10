interface ComingSoonPageProps {
  title: string;
}

export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <section className="empty-state">
      <p className="eyebrow">{title}</p>
      <h2>Coming soon</h2>
      <p>This section is reserved for the next CRM phases.</p>
    </section>
  );
}
