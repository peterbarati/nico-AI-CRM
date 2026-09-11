export interface ActivityMetrics {
  callsCompleted: number;
  customerInteractions: number;
  salesVisitsCompleted: number;
  openTasks: number;
  completedTasks: number;
  overdueTasks: number;
  followUpsCreated: number;
  csToSalesHandoffs: number;
  salesToCsHandoffs: number;
  reactivationActivities: number;
  b2bActivities: number;
}
export interface UserActivity extends ActivityMetrics {
  userId: string;
  userName: string;
  role: string;
}
export interface ActivityReport {
  period: { fromDate: string; toDate: string; timezone: string };
  metrics: ActivityMetrics;
  users: UserActivity[];
}
