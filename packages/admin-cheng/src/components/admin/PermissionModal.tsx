import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Tree, Button, Space, Spin, Empty } from 'antd';
import type { TreeDataNode } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { adminApi } from '../../api/services/admin';
import type { PermissionNode } from '@/api/types/permission';
import {
  buildPermissionTreeData,
  filterRedundantUrns,
} from '@/utils/permissionTreeUtils';

export interface PermissionModalProps {
  visible: boolean;
  roleId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const PermissionModal: React.FC<PermissionModalProps> = ({ visible, roleId, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allNodes, setAllNodes] = useState<PermissionNode[]>([]);
  const [treeData, setTreeData] = useState<TreeDataNode[]>([]);
  const [checkedUrns, setCheckedUrns] = useState<string[]>([]);
  const [roleName, setRoleName] = useState('');
  const { success, error: showError } = useAppNotification();
  const requestSeq = useRef(0);

  // 弹窗打开时加载权限树和角色已有权限
  useEffect(() => {
    if (visible && roleId) {
      const seq = ++requestSeq.current;
      setLoading(true);
      setCheckedUrns([]);

      Promise.all([
        adminApi.getPermissions(),
        adminApi.getRoleDetail(roleId),
      ])
        .then(([allPerms, roleDetail]) => {
          // 弹窗已关闭或切换了角色，丢弃迟到响应，防止角色 A 的权限串到角色 B
          if (seq !== requestSeq.current) return;
          const nodes: PermissionNode[] = Array.isArray(allPerms) ? allPerms : [];
          setAllNodes(nodes);

          const urns: string[] = roleDetail?.permissions || [];
          setRoleName(roleDetail?.name || '');
          setCheckedUrns(urns);
          setTreeData(buildPermissionTreeData(nodes, new Set(urns), false));
        })
        .catch((err: any) => {
          if (seq !== requestSeq.current) return;
          showError(err?.response?.data?.message || err?.message || '加载权限数据失败');
        })
        .finally(() => setLoading(false));
    }
  }, [visible, roleId]);

  const handleCheck = useCallback((keys: any) => {
    const raw: string[] = Array.isArray(keys) ? keys : (keys as any).checked || [];
    // 勾选父级时立即剔除被祖先覆盖的子孙，子级自动取消勾选
    const compacted = filterRedundantUrns(raw, allNodes);
    setCheckedUrns(compacted);
    setTreeData(buildPermissionTreeData(allNodes, new Set(compacted), false));
  }, [allNodes]);

  const handleSave = async () => {
    if (!roleId) return;
    try {
      setSaving(true);
      const compacted = filterRedundantUrns(checkedUrns, allNodes);
      await adminApi.updateRole(roleId, { permissions: compacted });
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
    requestSeq.current++; // 失效未完成的加载请求
    setCheckedUrns([]);
    onClose();
  };

  // 关闭时失效未完成的加载请求（含外部关闭路径），防止角色 A 的权限迟到写回角色 B
  useEffect(() => {
    if (!visible) {
      requestSeq.current++;
    }
  }, [visible]);

  return (
    <ScrollableModal
      title={`角色权限 — ${roleName || roleId || ''}`}
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
          checkedKeys={checkedUrns}
          onCheck={handleCheck}
          treeData={treeData}
        />
      )}
    </ScrollableModal>
  );
};

export default PermissionModal;
