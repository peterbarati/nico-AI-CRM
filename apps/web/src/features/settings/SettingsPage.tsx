import { useEffect, useState } from "react";
import { formatLabel } from "../customers/formatting";
import { fetchSettings, saveSettings } from "./api";
import type { ConfigSetting, SettingsData } from "./types";

export function SettingsPage({ canWrite = true }: { canWrite?: boolean }) {
  const [data, setData] = useState<SettingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchSettings()
      .then(setData)
      .catch((error: unknown) =>
        setError(error instanceof Error ? error.message : "Settings unavailable.")
      );
  }, []);
  if (error && !data)
    return (
      <div className="error-state">
        <h2>Settings unavailable</h2>
        <p>{error}</p>
      </div>
    );
  if (!data) return <div className="loading-state">Loading business settings...</div>;
  const updateSetting = (section: keyof SettingsData["sections"], key: string, value: string) =>
    canWrite &&
    setData((current) =>
      current
        ? {
            ...current,
            sections: {
              ...current.sections,
              [section]: current.sections[section].map((item) =>
                item.key === key ? { ...item, value } : item
              )
            }
          }
        : current
    );
  async function save() {
    if (!data) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      setData(await saveSettings(data));
      setNotice("Business settings saved. Live deterministic rules will use the new values.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Business settings</h2>
        </div>
        <p>
          Allowlisted operational rules and targets. Secrets and account security are managed
          elsewhere.
        </p>
      </div>
      {notice ? <p className="success-notice">{notice}</p> : null}
      {error ? <p className="error-notice">{error}</p> : null}
      <SettingsSection
        title="Customer Service"
        settings={data.sections.customerService}
        disabled={!canWrite}
        onChange={(key, value) => updateSetting("customerService", key, value)}
      />
      <section className="settings-section">
        <h3>Sales</h3>
        <p className="muted">
          Sales workflow configuration uses structured visit and handoff rules. No additional
          tunable values are approved yet.
        </p>
      </section>
      <SettingsSection
        title="Business"
        settings={data.sections.business}
        disabled={!canWrite}
        onChange={(key, value) => updateSetting("business", key, value)}
      />
      <SettingsSection
        title="AI"
        settings={data.sections.ai}
        disabled={!canWrite}
        onChange={(key, value) => updateSetting("ai", key, value)}
      >
        <p className="settings-availability">
          Provider: {data.aiAvailability.provider} ·{" "}
          {data.aiAvailability.configured ? "Available" : "Not configured"}. API secrets are never
          displayed.
        </p>
      </SettingsSection>
      <section className="settings-section">
        <h3>KPI</h3>
        <SettingsFields
          settings={data.sections.kpi}
          disabled={!canWrite}
          onChange={(key, value) => updateSetting("kpi", key, value)}
        />
        <div className="table-wrap table-wrap--compact">
          <table className="crm-table crm-table--compact">
            <thead>
              <tr>
                <th>KPI</th>
                <th>Role</th>
                <th>Target</th>
                <th>Weight</th>
                <th>Period</th>
              </tr>
            </thead>
            <tbody>
              {data.kpi.targets.map((target) => (
                <tr key={target.id}>
                  <td>
                    {target.name}
                    <span>{target.code}</span>
                  </td>
                  <td>{formatLabel(target.role)}</td>
                  <td>
                    <input
                      type="number"
                      disabled={!canWrite}
                      min="0"
                      value={target.targetValue}
                      onChange={(event) =>
                        setData({
                          ...data,
                          kpi: {
                            ...data.kpi,
                            targets: data.kpi.targets.map((item) =>
                              item.id === target.id
                                ? { ...item, targetValue: Number(event.target.value) }
                                : item
                            )
                          }
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      disabled={!canWrite}
                      min="0"
                      max="1"
                      step="0.05"
                      value={target.weight}
                      onChange={(event) =>
                        setData({
                          ...data,
                          kpi: {
                            ...data.kpi,
                            targets: data.kpi.targets.map((item) =>
                              item.id === target.id
                                ? { ...item, weight: Number(event.target.value) }
                                : item
                            )
                          }
                        })
                      }
                    />
                  </td>
                  <td>
                    {target.periodStart} – {target.periodEnd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.kpi.companyTargets.map((target) => (
          <label key={target.id}>
            Company {target.name} target
            <input
              type="number"
              disabled={!canWrite}
              min="0"
              value={target.targetValue}
              onChange={(event) =>
                setData({
                  ...data,
                  kpi: {
                    ...data.kpi,
                    companyTargets: data.kpi.companyTargets.map((item) =>
                      item.id === target.id
                        ? { ...item, targetValue: Number(event.target.value) }
                        : item
                    )
                  }
                })
              }
            />
          </label>
        ))}
      </section>
      <div className="settings-actions">
        {canWrite ? (
          <button disabled={saving} onClick={() => void save()} type="button">
            {saving ? "Saving..." : "Save settings"}
          </button>
        ) : (
          <p className="muted">Read-only access</p>
        )}
      </div>
    </section>
  );
}

function SettingsSection({
  title,
  settings,
  disabled,
  onChange,
  children
}: {
  title: string;
  settings: ConfigSetting[];
  disabled: boolean;
  onChange: (key: string, value: string) => void;
  children?: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      {children}
      <SettingsFields disabled={disabled} settings={settings} onChange={onChange} />
    </section>
  );
}
function SettingsFields({
  settings,
  disabled,
  onChange
}: {
  settings: ConfigSetting[];
  disabled: boolean;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="settings-grid">
      {settings.map((setting) => (
        <label key={setting.key}>
          {formatLabel(setting.key.split(".").at(-1) ?? setting.key)}
          {setting.valueType === "boolean" ? (
            <select
              disabled={disabled}
              value={setting.value}
              onChange={(event) => onChange(setting.key, event.target.value)}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          ) : setting.key === "ai.provider" ? (
            <select
              disabled={disabled}
              value={setting.value}
              onChange={(event) => onChange(setting.key, event.target.value)}
            >
              <option value="MOCK">Mock</option>
              <option value="OPENAI">OpenAI</option>
            </select>
          ) : (
            <input
              disabled={disabled}
              type={setting.valueType === "number" ? "number" : "text"}
              value={setting.value}
              onChange={(event) => onChange(setting.key, event.target.value)}
            />
          )}
          <small>{setting.description}</small>
        </label>
      ))}
    </div>
  );
}
