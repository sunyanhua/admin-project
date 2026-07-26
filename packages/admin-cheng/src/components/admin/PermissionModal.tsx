import { useState, useEffect, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Tree, Button, Space, Spin, Empty } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import type { TreeDataNode } from 'antd';
import { adminApi, PermissionNode, AdminRole } from '../../api/services/admin';

export interface PermissionModalProps {
  visible: boolean;
  role: AdminRole | null;
  onClose: () => void;
  onSuccess?: () => void;
}

// 递归收集某个节点的所有子孙节点 ID
function getDescendantIds(node: PermissionNode): number[] {
  const ids: number[] = [];
  if (node.children) {
    node.children.forEach((child) => {
      ids.push(child.id);
      ids.push(...getDescendantIds(child));
    });
  }
  return ids;
}

// 在 allNodes 中按 ID 查找节点
function findNode(nodes: PermissionNode[], id: number): PermissionNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// 构建 TreeDataNode，被祖先勾选的节点设为 disabled
function buildTreeData(
  nodes: PermissionNode[],
  checkedSet: Set<number>,
  ancestorChecked: boolean,
): TreeDataNode[] {
  return nodes.map((node) => {
    const isChecked = checkedSet.has(node.id);
    const disabled = ancestorChecked && !isChecked; // 祖先被勾选时，自身未勾选则禁用
    // 当前节点被勾选后，其子孙都应禁用
    const childAncestorChecked = ancestorChecked || isChecked;
    return {
      key: node.id,
      title: (
        <span style={disabled ? { color: '#bfbfbf' } : undefined}>
          <span style={{ fontWeight: 500 }}>{node.name}</span>
          <span style={{ color: disabled ? '#d9d9d9' : '#999', marginLeft: 8, fontSize: 12 }}>
            {node.urn}
          </span>
        </span>
      ),
      disabled,
      children: node.children
        ? buildTreeData(node.children, checkedSet, childAncestorChecked)
        : undefined,
    };
  });
}

// 从 checkedKeys 中移除已被祖先节点覆盖的子孙节点
function filterRedundant(checkedKeys: number[], allNodes: PermissionNode[]): number[] {
  const checkedSet = new Set(checkedKeys);
  const redundant: Set<number> = new Set();

  for (const key of checkedKeys) {
    const node = findNode(allNodes, key);
    if (node) {
      const descendants = getDescendantIds(node);
      descendants.forEach((d) => redundant.add(d));
    }
  }

  return checkedKeys.filter((k) => !redundant.has(k));
}

const PermissionModal: React.FC<PermissionModalProps> = ({ visible, role, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allNodes, setAllNodes] = useState<PermissionNode[]>([]);
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const { success, error: showError } = useAppNotification();

  // 弹窗打开时加载权限树和角色已有权限
  useEffect(() => {
    if (visible && role) {
      setLoading(true);
      setCheckedKeys([]);

      Promise.all([
        adminApi.getPermissions(),
        adminApi.getRolePermissions(role.id),
      ])
        .then(([allPerms, rolePerms]) => {
          const nodes: PermissionNode[] = Array.isArray(allPerms) ? allPerms : [];
          setAllNodes(nodes);

          const ids: number[] = rolePerms?.permission_ids || [];
          setCheckedKeys(ids);
          setTreeData(buildTreeData(nodes, new Set(ids), false));
        })
        .catch((err: any) => {
          showError(err?.response?.data?.message || err?.message || '加载权限数据失败');
        })
        .finally(() => setLoading(false));
    }
  }, [visible, role]);

  const handleCheck = useCallback((keys: any) => {
    const k: number[] = Array.isArray(keys) ? keys : (keys as any).checked || [];
    setCheckedKeys(k);
    setTreeData(buildTreeData(allNodes, new Set(k), false));
  }, [allNodes]);

  const handleSave = async () => {
    if (!role) return;
    try {
      setSaving(true);
      // 提交前过滤掉被祖先节点覆盖的子孙节点
      const compacted = filterRedundant(checkedKeys, allNodes);
      await adminApi.setRolePermissions(role.id, compacted);
      success('权限分配成功');
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || '权限分配失败';
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCheckedKeys([]);
    onClose();
  };

  return (
    <ScrollableModal
      title={`角色权限 — ${role?.name || ''}`}
      open={visible}
      onCancel={handleCancel}
      width={640}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : treeData.length === 0 ? (
        <Empty description="暂无权限数据" />
      ) : (
        <Tree
          checkable
          checkStrictly
          defaultExpandAll
          checkedKeys={checkedKeys}
          onCheck={handleCheck}
          treeData={treeData}
        />
      )}
    </ScrollableModal>
  );
};

export default PermissionModal;
