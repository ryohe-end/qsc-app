// src/lib/roles.ts
export type Role = "admin" | "auditor" | "manager" | "viewer";

export const ROLE_ORDER: Role[] = ["admin", "auditor", "manager", "viewer"];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "管理者",
  auditor: "監査者",
  manager: "店舗",
  viewer: "閲覧",
};
