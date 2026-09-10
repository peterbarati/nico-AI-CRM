export interface KpiDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  metricType: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KpiTarget {
  id: string;
  kpiDefinitionId: string;
  userId: string | null;
  role: string | null;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  targetValue: number;
  weight: number | null;
  createdAt: string;
  updatedAt: string;
}
