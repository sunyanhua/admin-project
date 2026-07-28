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

/** 递归收集某个节点的所有子孙 urn */
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

/** 从 checkedUrns 中移除已被祖先节点覆盖的子孙节点 */
export function filterRedundantUrns(checkedUrns: string[], allNodes: PermissionNode[]): string[] {
  const redundant = new Set<string>();
  for (const urn of checkedUrns) {
    const node = findNodeByUrn(allNodes, urn);
    if (node) {
      getDescendantUrns(node).forEach((d) => redundant.add(d));
    }
  }
  return checkedUrns.filter((k) => !redundant.has(k));
}

/** 构建 TreeDataNode：
 *  - 被勾选的节点的子孙设为 disabled（父级已覆盖）
 *  - ancestorChecked 为 true 且自身未勾选 → disabled
 *  - 被 disabled 的节点显示灰色 */
export function buildPermissionTreeData(
  nodes: PermissionNode[],
  checkedSet: Set<string>,
  ancestorChecked: boolean,
): TreeDataNode[] {
  return nodes.map((node) => {
    const isChecked = checkedSet.has(node.urn);
    const disabled = (ancestorChecked && !isChecked);
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
