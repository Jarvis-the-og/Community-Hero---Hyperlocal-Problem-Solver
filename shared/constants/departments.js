import { deployment } from '../config/deployment.ts';

export const DEPARTMENTS = deployment.departments;

/** Map AI-suggested department names to canonical department names */
export const DEPARTMENT_ALIASES = deployment.departmentAliases;

export function normalizeDepartment(name) {
  const fallback = deployment.departments[0];
  if (!name) return fallback;
  const lower = name.toLowerCase().trim();
  if (DEPARTMENT_ALIASES[lower]) return DEPARTMENT_ALIASES[lower];
  const match = DEPARTMENTS.find((d) => d.toLowerCase() === lower);
  if (match) return match;
  const partial = DEPARTMENTS.find((d) => lower.includes(d.toLowerCase().split(' ')[0]));
  return partial || fallback;
}

/** SLA hours by priority before auto-escalation */
export const SLA_HOURS = {
  critical: 24,
  medium: 72,
  low: 168,
};
