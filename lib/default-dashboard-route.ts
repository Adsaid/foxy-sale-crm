const CALLS_HOME_ROLES = new Set(["SALES", "DEV", "DESIGNER"]);

export function getDefaultDashboardPath(role: string): string {
  return CALLS_HOME_ROLES.has(role) ? "/dashboard/calls" : "/dashboard";
}
