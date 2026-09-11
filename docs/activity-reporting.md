# Activity Reporting

`GET /api/reports/activity` returns server-side aggregates for today, the current Monday-based week, the current month, or a custom inclusive date range. Business dates use the `system.business_timezone` IANA setting and are converted to UTC-exclusive boundaries before SQL is executed.

The report includes calls, interactions, completed visits, current open and overdue tasks, tasks completed in the period, follow-ups created, directional handoffs, and identifiable reactivation/B2B activity. Per-user rows and totals honor optional role and user filters.

Open and overdue task counts are current operational snapshots. Completed-task and activity counts are constrained to the selected period. The report uses normalized foreign-key links (`source_interaction_id` and `source_visit_id`) rather than note parsing.
