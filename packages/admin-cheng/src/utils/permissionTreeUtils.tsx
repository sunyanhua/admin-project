import type { PermissionNode } from '@/api/types/permission';
import type { TreeDataNode } from 'antd';

/** 按 urn 查找节点 */
export function findNodeByUrn(nodes: PermissionNode[], urn: string): PermissionNode | null {
  for (const node of nodes) {
    if (node.urn === urn) return node;
    if (node.children) {
      const found = findNodeByUrn(node.children, urn);
      if (found) return found;
    }
  }
  return null;
}

/** 递归收集某个节点的所有子孙 urn（按树结构） */
export function getDescendantUrns(node: PermissionNode): string[] {
  const urns: string[] = [];
  if (node.children) {
    node.children.forEach((child) => {
      urns.push(child.urn);
      urns.push(...getDescendantUrns(child));
    });
  }
  return urns;
}

/** 递归收集整棵树的所有 urn */
export function collectAllUrns(nodes: PermissionNode[]): string[] {
  const urns: string[] = [];
  for (const node of nodes) {
    urns.push(node.urn);
    if (node.children) {
      urns.push(...collectAllUrns(node.children));
    }
  }
  return urns;
}

/**
 * 判断 targetUrn 是否被 wildcard 覆盖。
 * 例: "urn:tlnc:admin:*" 覆盖 "urn:tlnc:admin:user"、"urn:tlnc:admin:user:read" 等
 */
export function isUrnCoveredBy(wildcard: string, targetUrn: string): boolean {
  if (!wildcard.endsWith(':*')) return false;
  const prefix = wildcard.slice(0, -2); // 去掉末尾 ":*"
  return targetUrn !== wildcard && targetUrn.startsWith(prefix);
}

/** 从 checkedUrns 中移除冗余节点：
 *  1. 树结构：祖先已勾选 → 子孙冗余
 *  2. Wildcard：如 "urn:tlnc:admin:*" 已勾选 → 所有匹配的 URN 冗余 */
export function filterRedundantUrns(checkedUrns: string[], allNodes: PermissionNode[]): string[] {
  const redundant = new Set<string>();
  const allUrns = collectAllUrns(allNodes);

  for (const urn of checkedUrns) {
    // 树结构：子孙冗余
    const node = findNodeByUrn(allNodes, urn);
    if (node) {
      getDescendantUrns(node).forEach((d) => redundant.add(d));
    }
    // Wildcard 匹配：所有被通配符覆盖的 URN 冗余
    for (const target of allUrns) {
      if (isUrnCoveredBy(urn, target)) {
        redundant.add(target);
      }
    }
  }

  return checkedUrns.filter((k) => !redundant.has(k));
}

/** 构建 TreeDataNode：
 *  - nonLeafAncestorChecked: 树结构中祖先已勾选 → 自身未勾选则 disabled
 *  - coveredByWildcard: 被某个通配符 URN 覆盖 → disabled
 *  - 被 disabled 的节点显示灰色 */
export function buildPermissionTreeData(
  nodes: PermissionNode[],
  checkedSet: Set<string>,
  ancestorChecked: boolean,
): TreeDataNode[] {
  // 收集所有已勾选的 wildcard URN（用于判断是否覆盖）
  const wildcards = Array.from(checkedSet).filter((u) => u.endsWith(':*'));

  const isCoveredByWildcard = (urn: string): boolean => {
    return !checkedSet.has(urn) && wildcards.some((w) => isUrnCoveredBy(w, urn));
  };

  return nodes.map((node) => {
    const isChecked = checkedSet.has(node.urn);
    const covered = !isChecked && ancestorChecked;
    const wildcardDisabled = isCoveredByWildcard(node.urn);
    const disabled = covered || wildcardDisabled;
    const childAncestorChecked = ancestorChecked || isChecked;
    return {
      key: node.urn,
      title: (
        <span style={disabled ? { color: '#bfbfbf' } : undefined}>
          <span style={{ fontWeight: 500 }}>{node.urn}</span>
          {node.description && (
            <span style={{ color: disabled ? '#d9d9d9' : '#999', marginLeft: 8, fontSize: 12 }}>
              {node.description}
            </span>
          )}
        </span>
      ),
      disabled,
      children: node.children
        ? buildPermissionTreeData(node.children, checkedSet, childAncestorChecked)
        : undefined,
    };
  });
}

/** 仅展示用（无勾选状态），创建角色弹窗初始化权限树 */
export function buildSimpleTreeData(nodes: PermissionNode[]): TreeDataNode[] {
  return nodes.map((node) => ({
    key: node.urn,
    title: (
      <span>
        <span style={{ fontWeight: 500 }}>{node.urn}</span>
        {node.description && (
          <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>{node.description}</span>
        )}
      </span>
    ),
    children: node.children ? buildSimpleTreeData(node.children) : undefined,
  }));
}
