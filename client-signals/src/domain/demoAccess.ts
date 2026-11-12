import { INITIAL_CLIENTS } from "../data/fixtures";
export type DemoPersonaId = "rm-primary" | "rm-secondary" | "team-lead";
export type DemoPermission = "read" | "comment" | "edit";
const secondaryIds = ["apex-biotech", "meridian-freight", "northstar-logistics", "silverline-medical", "granite-building", "cedar-education", "seabrook-marine", "hillcrest-services", "riverside-pharma", "summit-coldchain"];
export const DEMO_PERSONAS: Record<DemoPersonaId, { name: string; position: string; level: number; clientIds: string[]; permissions: DemoPermission[] }> = {
  "rm-primary": { name: "Gabriel V.", position: "Coverage RM", level: 3, clientIds: INITIAL_CLIENTS.map(c => c.id), permissions: ["read", "comment", "edit"] },
  "rm-secondary": { name: "Taylor M.", position: "Associate RM", level: 2, clientIds: secondaryIds, permissions: ["read", "comment"] },
  "team-lead": { name: "Morgan L.", position: "Team Lead", level: 3, clientIds: INITIAL_CLIENTS.map(c => c.id), permissions: ["read", "comment", "edit"] },
};
export function normalizeDemoPersona(value: unknown): DemoPersonaId {
  return value === "rm-secondary" || value === "team-lead" ? value : "rm-primary";
}
export function scopeDemoClients(persona: DemoPersonaId) {
  const ids = new Set(DEMO_PERSONAS[persona].clientIds);
  return INITIAL_CLIENTS.filter(c => ids.has(c.id));
}
export function canDemoAccessClient(persona: DemoPersonaId, id: string) {
  return DEMO_PERSONAS[persona].clientIds.includes(id);
}
export function canDemoPermission(persona: DemoPersonaId, permission: DemoPermission) {
  return DEMO_PERSONAS[persona].permissions.includes(permission);
}
// Illustrative only: client-side persona switching is not authentication.
