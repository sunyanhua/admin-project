import { useState, useCallback } from 'react';
import { Space, Typography, Switch, Avatar, Button, Modal, Tag, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { userApi } from '../../api/services/user';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '../../components/user/UserDetailSections';
import request from '@/api';
import '../../styles/user-detail-modal.css';

const { Title } = Typography;

const GENDER_MAP: Record<number, string> = { 1: '男', 2: '女' };

const ZODIAC_MAP: Array<[number, string, string]> = [
  [20, '摩羯座', '水瓶座'], [19, '水瓶座', '双鱼座'], [20, '双鱼座', '白羊座'],
  [20, '白羊座', '金牛座'], [20, '金牛座', '双子座'], [21, '双子座', '巨蟹座'],
  [22, '巨蟹座', '狮子座'], [22, '狮子座', '处女座'], [22, '处女座', '天秤座'],
  [23, '天秤座', '天蝎座'], [22, '天蝎座', '射手座'], [21, '射手座', '摩羯座'],
];

const getZodiac = (birthday: string): string => {
  if (!birthday) return '-';
  const d = new Date(birthday);
  if (isNaN(d.getTime())) return '-';
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const [border, prev, curr] = ZODIAC_MAP[month - 1];
  return day < border ? prev : curr;
};

const getAge = (birthday: string): number | string => {
  if (!birthday) return '-';
  const birth = new Date(birthday);
  if (isNaN(birth.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : '-';
};

const formatDateTime = (dt: string): string => {
  if (!dt) return '-';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const formatDate = (dt: string): string => {
  if (!dt) return '-';
  const d = new Date(dt);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
};

const GENDER_OPTIONS = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
];

const STATUS_OPTIONS = [
  { label: '正常', value: 0 },
  { label: '屏蔽', value: 1 },
  { label: '未激活', value: 3 },
];

const COOP_ROLE_OPTIONS = [
  { label: '官方用户', value: 3 },
  { label: '主理人', value: 2 },
  { label: '合作商户', value: 1 },
  { label: '推荐用户', value: true },
];

const CoopRoleTag = ({ role }: { role: number }) => {
  const roleMap: Record<number, { text: string; color: string }> = {
    3: { text: '官方用户', color: 'orange' },
    2: { text: '主理人', color: 'gold' },
    1: { text: '合作商户', color: 'blue' },
  };
  const roleInfo = roleMap[role];
  if (!roleInfo) return null;
  return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
};

const isExpired = (expiry: string): boolean => {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
};

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'coop_role', placeholder: '全部身份', type: 'select', options: COOP_ROLE_OPTIONS },
  { name: 'gender', placeholder: '全部性别', type: 'select', options: GENDER_OPTIONS },
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

const UserList = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailModalData, setDetailModalData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [revokeModalVisible, setRevokeModalVisible] = useState(false);
  const [revokeModalRecord, setRevokeModalRecord] = useState<any>(null);
  const [statusReason, setStatusReason] = useState('');

  const fetchUsers = useCallback(async (params: any) => {
    // 转换coop_role=true为recom=true，其他身份coop_role值不变
    if (params.coop_role === true) {
      return userApi.getUsers({ ...params, recom: true, coop_role: undefined });
    }
    return userApi.getUsers(params);
  }, []);

  const formatUserResponse = useCallback((res: any) => ({
    list: res?.data || [],
    count: res?.count ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<any>({
    fetchFn: fetchUsers,
    formatResponse: formatUserResponse,
  });

  const { success, error } = useAppNotification();

  const handleStatusToggle = async (record: any, checked: boolean) => {
    try {
      await userApi.updateUserStatus(record.id, checked ? 0 : 1);
      success(checked ? '用户已设为正常' : '用户已屏蔽');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  const handleViewDetail = async (record: any) => {
    setDetailModalData(null);
    setDetailLoading(true);
    try {
      const res = await userApi.getUserDetail(record.id) as any;
      setDetailModalData(res?.data || res || {});
    } catch (error: any) {
      // error handled by useListPage
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async (checked: boolean) => {
    if (!detailModalData) return;
    try {
      await userApi.updateUserStatus(detailModalData.id, checked ? 0 : 1);
      success(checked ? '用户已设为正常' : '用户已屏蔽');
      setDetailModalData({ ...detailModalData, status: checked ? 0 : 1 });
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  const handleOfficialChange = async (checked: boolean) => {
    if (!detailModalData) return;
    const isCurrentlyOfficial = !!(detailModalData.coop_auth && detailModalData.coop_role === 3);

    if (checked) {
      // 设为官方用户 - 弹出确认框
      Modal.confirm({
        title: '确认操作',
        content: `确定要将用户 "${detailModalData.nick || detailModalData.userid}" 设为官方用户吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          setActionLoading(true);
          try {
            await request.post('/admin/v6/user/coop', { id: detailModalData.id, coop_role: 3, coop_auth: 1, coop_commission: 0, inbox: true, inbox_title: '官方认证状态更新通知', inbox_intro: '您已被设置为官方认证用户，请点击查看详情！' });
            success('已设为官方用户');
            setDetailModalData({ ...detailModalData, coop_role: 3, coop_auth: 1 });
            refresh();
          } catch (err: any) {
            error(err.response?.data?.msg || '操作失败');
          } finally {
            setActionLoading(false);
          }
        },
        onCancel: () => {
          // 取消时回滚 checkbox 状态 - 需要重新渲染来恢复
          setDetailModalData({ ...detailModalData });
        },
      });
    } else {
      // 取消官方用户 - 弹出原因输入框
      setRevokeModalRecord(detailModalData);
      setStatusReason('');
      setRevokeModalVisible(true);
    }
  };

  const handleRecommendChange = async (checked: boolean) => {
    if (!detailModalData) return;
    try {
      await userApi.setRecommendUser(detailModalData.id, checked);
      success(checked ? '已设为推荐用户' : '已取消推荐用户');
      setDetailModalData({ ...detailModalData, recom: checked ? 1 : 0 });
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  const handleSetOfficialUser = (record: any) => {
    Modal.confirm({
      title: '确认操作',
      content: `确定要将用户 "${record.nick || record.userid}" 设为官方用户吗？`,
      okText: '确认',
      cancelText: '取消',
      getContainer: false,
      onOk: async () => {
        setActionLoading(true);
        try {
          await request.post('/admin/v6/user/coop', { id: record.id, coop_role: 3, coop_commission: 0, inbox: true, inbox_title: '官方认证状态更新通知', inbox_intro: '您已被设置为官方认证用户，请点击查看详情！' });
          success('操作成功');
          setDetailModalData(null);
          refresh();
        } catch (err: any) {
          error(err.response?.data?.msg || '操作失败');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleRevokeOfficialUser = (record: any) => {
    setRevokeModalRecord(record);
    setStatusReason('');
    setRevokeModalVisible(true);
  };

  const handleRevokeConfirm = async () => {
    if (!revokeModalRecord || !statusReason.trim()) {
      error('请填写取消原因');
      return;
    }
    setActionLoading(true);
    try {
      await request.post('/admin/v6/user/coop/revoke', { id: revokeModalRecord.id, status_reason: statusReason, inbox: true, inbox_title: '官方认证状态更新通知', inbox_intro: '您的官方认证已被取消，请点击查看详情！' });
      success('已取消官方用户');
      setRevokeModalVisible(false);
      setDetailModalData({ ...detailModalData, coop_auth: 0, coop_role: undefined });
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    } finally {
      setActionLoading(false);
    }
  };

  const renderDetailFooter = () => {
    // 官方用户操作已移至弹窗内的管理操作区域
    return null;
  };

  const columns: ColumnsType<any> = [
    {
      title: '用户',
      key: 'user',
      width: 220,
      render: (_: any, record: any) => {
        const showIdentity = record.coop_auth && !isExpired(record.coop_auth_expiry) && record.coop_role;
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewDetail(record)}>
            <Space size={4}>
              <Avatar src={record.avatar} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{record.nick || '-'}</span>
              {showIdentity && <CoopRoleTag role={record.coop_role} />}
              {record.recom && <Tag color="red">推荐</Tag>}
            </Space>
          </Button>
        );
      },
    },
    { title: '手机号', dataIndex: 'phone', key: 'phone', width: 130 },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 70,
      render: (gender: number) => GENDER_MAP[gender] || '未知',
    },
    {
      title: '年龄',
      dataIndex: 'birthday',
      key: 'age',
      width: 60,
      render: (birthday: string) => getAge(birthday),
    },
    {
      title: '星座',
      dataIndex: 'birthday',
      key: 'zodiac',
      width: 80,
      render: (birthday: string) => getZodiac(birthday),
    },
    { title: 'MBTI', dataIndex: 'mbti', key: 'mbti', width: 70, render: (v: string) => v || '-' },
    {
      title: '注册时间',
      dataIndex: 'insertat',
      key: 'insertat',
      width: 120,
      render: (t: string) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>{formatDate(t)}</div>
          <div style={{ color: '#666', fontSize: 12 }}>{t ? formatDateTime(t).split(' ')[1] : '-'}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: number, record: any) => {
        if (status === 3) return <Tag color="default">未激活</Tag>;
        return (
          <Switch
            checked={status === 0}
            onChange={(checked) => handleStatusToggle(record, checked)}
            checkedChildren="正常"
            unCheckedChildren="屏蔽"
          />
        );
      },
    },
    ActionColumn({
      onView: handleViewDetail,
      showView: true,
      showEdit: false,
      showDelete: false,
      width: 100,
    }),
  ];

  const handleChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = (vals: Record<string, any>) => {
    search(vals);
  };

  const handleReset = () => {
    setValues({});
    search({});
  };

  return (
    <>
      <StandardPage
        title="注册用户管理"
        description="管理平台的注册用户信息。"
        showRefreshButton={true}
        onRefresh={refresh}
        searchArea={
          <SearchPanel
            filters={filters}
            values={values}
            onChange={handleChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />
        }
        table={
          <StandardTable
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={pagination}
            onPageChange={onPageChange}
            scroll={{ x: 1000 }}
          />
        }
      />

      <DetailModal
        title="用户详情"
        open={!!detailModalData}
        onClose={() => setDetailModalData(null)}
        entity={detailModalData}
        className="user-detail-modal"
        footer={renderDetailFooter()}
      >
        {(d) => UserDetailSections({ user: d, onStatusChange: handleStatusChange, onOfficialChange: handleOfficialChange, onRecommendChange: handleRecommendChange, disabled: d.status === 3 })}
      </DetailModal>

      <Modal
        title="取消官方用户"
        open={revokeModalVisible}
        onCancel={() => setRevokeModalVisible(false)}
        onOk={handleRevokeConfirm}
        confirmLoading={actionLoading}
        okText="确认"
        cancelText="取消"
      >
        <p style={{ marginBottom: 16 }}>
          确定要取消用户 "<strong>{revokeModalRecord?.nick || revokeModalRecord?.userid}</strong>" 的官方用户身份吗？
        </p>
        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>取消原因：</label>
          <Input.TextArea
            value={statusReason}
            onChange={(e) => setStatusReason(e.target.value)}
            placeholder="请填写取消原因"
            rows={3}
          />
        </div>
      </Modal>
    </>
  );
};

export default UserList;
