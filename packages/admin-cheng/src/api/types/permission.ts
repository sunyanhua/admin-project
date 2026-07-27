/** 权限树节点 — Swagger PermissionNode */
export interface PermissionNode {
  urn: string;
  description: string;
  children?: PermissionNode[];
}
