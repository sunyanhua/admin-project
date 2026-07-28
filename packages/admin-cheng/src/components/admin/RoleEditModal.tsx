import { useState, useEffect, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Button, Space, Tree, Spin, Empty } from 'antd';
import type { TreeDataNode } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { adminApi } from '../../api/services/admin';
import type { RoleListItem } from '@/api/types/admin';
import type { PermissionNode } from '@/api/types/permission';
import {
  buildPermissionTreeData,
  filterRedundantUrns,
} from '@/utils/permissionTreeUtils';

export interface RoleEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  role: RoleListItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const RoleEditModal: React.FC<RoleEditModalProps> = ({ visible, mode, role, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();
  const isCreate = mode === 'create';

  // 创建模式下的权限树
  const [allPermNodes, setAllPermNodes] = useState<PermissionNode[]>([]);
  const [permTree, setPermTree] = useState<TreeDataNode[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [checkedUrns, setCheckedUrns] = useState<string[]>([]);

  // 加载权限树（仅创建时需要）
  useEffect(() => {
    if (visible && isCreate) {
      setPermLoading(true);
      adminApi.getPermissions()
        .then((nodes: PermissionNode[]) => {
          const n = nodes || [];
          setAllPermNodes(n);
          setPermTree(buildPermissionTreeData(n, new Set(), false));
        })
        .catch(() => { setAllPermNodes([]); setPermTree([]); })
        .finally(() => setPermLoading(false));
    }
  }, [visible, isCreate]);

  useEffect(() => {
    if (visible) {
      setCheckedUrns([]);
      if (role && !isCreate) {
        form.setFieldsValue({
          name: role.name || '',
          description: role.description || '',
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, role, isCreate, form]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      if (isCreate) {
        if (checkedUrns.length === 0) {
          showError('请至少选择一个权限');
          return;
        }
        const compacted = filterRedundantUrns(checkedUrns, allPermNodes);
        await adminApi.createRole({
          name: values.name,
          description: values.description || undefined,
          permissions: compacted,
        });
        success('角色创建成功');
      } else {
        if (!role) return;
        await adminApi.updateRole(role.id, {
          name: values.name,
          description: values.description || undefined,
        });
        success('角色更新成功');
      }

      form.resetFields();
      setCheckedUrns([]);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || (isCreate ? '创建失败' : '更新失败');
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCheckedUrns([]);
    onClose();
  };

  const handlePermCheck = useCallback((keys: any) => {
    const raw: string[] = Array.isArray(keys) ? keys : (keys as any).checked || [];
    // 勾选父级时立即剔除被祖先覆盖的子孙，子级自动取消勾选
    const compacted = filterRedundantUrns(raw, allPermNodes);
    setCheckedUrns(compacted);
    setPermTree(buildPermissionTreeData(allPermNodes, new Set(compacted), false));
  }, [allPermNodes]);

  return (
    <ScrollableModal
      title={isCreate ? '添加角色' : '编辑角色'}
      open={visible}
      onCancel={handleCancel}
      width={560}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading} onClick={() => form.submit()}>
            {isCreate ? '创建' : '保存'}
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="角色名称"
          name="name"
          rules={[
            { required: true, message: '请输入角色名称' },
            { max: 32, message: '角色名称最多32个字符' },
          ]}
        >
          <Input placeholder="如 超级管理员" />
        </Form.Item>

        <Form.Item
          label="描述"
          name="description"
          rules={[{ max: 256, message: '描述最多256个字符' }]}
        >
          <Input.TextArea placeholder="角色描述（选填）" rows={3} />
        </Form.Item>

        {isCreate && (
          <Form.Item label="权限">
            {permLoading ? (
              <Spin />
            ) : permTree.length === 0 ? (
              <Empty description="暂无权限数据" />
            ) : (
              <Tree
                checkable
                checkStrictly
                defaultExpandAll
                checkedKeys={checkedUrns}
                onCheck={handlePermCheck}
                treeData={permTree}
              />
            )}
          </Form.Item>
        )}
      </Form>
    </ScrollableModal>
  );
};

export default RoleEditModal;
