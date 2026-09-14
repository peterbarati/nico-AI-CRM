export interface ConfigSetting {
  key: string;
  value: string;
  valueType: string;
  description: string | null;
}
export interface KpiSetting {
  id: string;
  code: string;
  name: string;
  role: string;
  targetValue: number;
  weight: number;
  periodStart: string;
  periodEnd: string;
  userId: string | null;
}
export interface CompanyTargetSetting {
  id: string;
  name: string;
  targetValue: number;
  periodStart: string;
  periodEnd: string;
}
export interface SettingsData {
  sections: {
    customerService: ConfigSetting[];
    sales: ConfigSetting[];
    kpi: ConfigSetting[];
    business: ConfigSetting[];
    ai: ConfigSetting[];
    campaign: ConfigSetting[];
  };
  kpi: { targets: KpiSetting[]; companyTargets: CompanyTargetSetting[] };
  aiAvailability: { provider: string; configured: boolean; secretStoredInEnvironment: boolean };
}
