export interface ConfigSetting {
  key: string;
  value: string;
  valueType: string;
  description: string | null;
}

export interface KpiSettingRow {
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
