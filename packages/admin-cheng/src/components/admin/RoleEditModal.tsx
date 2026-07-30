import { useState, useEffect, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Form, Input, Button, Space, Tree, Spin, Empty } from 'antd';
import type { TreeDataNode } from 'antd';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { adminApi } from '../../api/services/admin';
import type { RoleDetailResponse } from '@/api/types/admin';
import type { PermissionNode } from '@/api/types/permission';
import {
  buildPermissionTreeData,
  filterRedundantUrns,
} from '@/utils/permissionTreeUtils';

export interface RoleEditModalProps {
  visible: boolean;
  mode: 'create' | 'edit';
  roleId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const RoleEditModal: React.FC<RoleEditModalProps> = ({ visible, mode, roleId, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useAppNotification();
  const isCreate = mode === 'create';

  // 编辑模式：加载角色详情
  const [roleDetail, setRoleDetail] = useState<RoleDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  // 编辑模式：加载单条角色详情
  useEffect(() => {
    if (visible && !isCreate && roleId) {
      setDetailLoading(true);
      setRoleDetail(null);
      adminApi.getRoleDetail(roleId)
        .then((detail) => {
          setRoleDetail(detail);
          form.setFieldsValue({
            name: detail.name || '',
            description: detail.description || '',
          });
        })
        .catch((err) => {
          showError(err?.response?.data?.message || err?.message || '获取角色详情失败');
          onClose();
        })
        .finally(() => setDetailLoading(false));
    }
  }, [visible, isCreate, roleId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 弹窗打开/关闭时重置
  useEffect(() => {
    if (visible) {
      setCheckedUrns([]);
      if (isCreate) {
        form.resetFields();
      }
    } else {
      setRoleDetail(null);
    }
  }, [visible, isCreate, form]);

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
        if (!roleId) return;
        await adminApi.updateRole(roleId, {
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
    setRoleDetail(null);
    onClose();
  };

  const handlePermCheck = useCallback((keys: any) => {
    const raw: string[] = Array.isArray(keys) ? keys : (keys as any).checked || [];
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
      {detailLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin tip="加载角色信息…" /></div>
      ) : (
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
      )}
    </ScrollableModal>
  );
};

export default RoleEditModal;
