import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Avatar } from 'antd';
import { ExportOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { userApi } from '@/api/services/user';
import { zoneApi } from '@/api/services/zone';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import UserDetailCardModal from '@/components/user/UserDetailCardModal';
import RealNameWithTag from '@/components/user/RealNameWithTag';
import { getMediumUrl } from '@/utils/imageUtils';
import { MatchProfileAuditStatus, UserGenderLabels, MaritalStatusLabels } from '@/api/types/status';
import type { CommunityUserItem } from '@/api/types/user';
import { buildProfileUrl, splitPhotos, applyLinkColumns } from './excelExport.utils';

const AUDIT_MAP: Record<number, { color: string; text: string }> = {
  [MatchProfileAuditStatus.PENDING]: { color: 'processing', text: '待审核' },
  [MatchProfileAuditStatus.APPROVED]: { color: 'success', text: '已通过' },
  [MatchProfileAuditStatus.REJECTED]: { color: 'error', text: '已拒绝' },
  [MatchProfileAuditStatus.REVOKED]: { color: 'default', text: '已撤销' },
};

/** 显示状态（与脱单资料管理一致） */
function getDisplayStatus(mp: CommunityUserItem['match_profile']): { text: string; color: string } {
  if (!mp) return { text: '-', color: 'default' };
  if (!mp.is_active) return { text: '已退出', color: 'default' };
  if (mp.visibility === 1) return { text: '公开', color: 'success' };
  if (mp.visibility === 2) return { text: '仅专区可见', color: 'warning' };
  if (mp.visibility === 3) return { text: '已隐藏', color: 'warning' };
  return { text: '-', color: 'default' };
}

interface ZoneUsersListProps {
  zoneId: string;
  zoneName: string;
  /** 弹窗场景传 visible（每次打开刷新）；页面内嵌场景传 true */
  active?: boolean;
}

/**
 * 专区用户列表（内容组件）：弹窗（ZoneUsersModal）与专区管理后台页面共用。
 */
const ZoneUsersList: React.FC<ZoneUsersListProps> = ({ zoneId, zoneName, active = true }) => {
  const { success, error: showError } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailUserId, setUserDetailUserId] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchUsers = useCallback(async (params: any) => {
    if (!zoneId) return { list: [], total: 0 };
    return userApi.getUsers({
      page: params.page,
      size: params.page_size,
      keyword: params.keyword || undefined,
      has_match_profile: true,
      zone_id: zoneId,
    });
  }, [zoneId]);

  const formatUserResponse = useCallback((res: any) => ({
    list: res?.list || (Array.isArray(res) ? res : []),
    count: res?.total ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<CommunityUserItem>({
    fetchFn: fetchUsers,
    formatResponse: formatUserResponse,
    dependencies: [zoneId],
  });

  const prevKeyRef = useRef('');
  useEffect(() => {
    const key = `${active}-${zoneId}`;
    if (active && zoneId && key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      setSearchValues({});
      search({ _t: Date.now() });
    }
  }, [active, zoneId, search]);

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  const handleExport = async () => {
    setExporting(true);
    try {
      // 循环分页拉取全部专区用户
      const allData: CommunityUserItem[] = [];
      let page = 1;
      while (true) {
        const res: any = await userApi.getUsers({ page, size: 100, zone_id: zoneId, has_match_profile: true });
        const list: CommunityUserItem[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        allData.push(...list);
        if (list.length < 100) break;
        page++;
      }
      // 批量拉取脱敏身份证号（隐私接口，读取留痕）
      const userIds = allData.map(i => i.user.user_id).filter(Boolean);
      const idCardMap = userIds.length ? await userApi.getUserPrivacyBatch(userIds) : {};

      // 专区认证申请表单配置（form_config：id + label）
      let formFields: Array<{ id: string; label: string }> = [];
      try {
        const zoneRes: any = await zoneApi.getDetail(zoneId);
        const fc = typeof zoneRes?.form_config === 'string' ? JSON.parse(zoneRes.form_config) : zoneRes?.form_config;
        if (Array.isArray(fc)) formFields = fc.map((f: any) => ({ id: f.id, label: f.label }));
      } catch { /* ignore */ }

      // 认证接口拉取申请数据（user_id → 申请，取每个用户第一条）
      const appMap = new Map<string, any>();
      if (formFields.length > 0) {
        let ap = 1;
        while (true) {
          const ares: any = await zoneApi.getApplications(zoneId, { page: ap, size: 100 });
          const alist: any[] = Array.isArray(ares) ? ares : (ares?.list || []);
          if (!alist.length) break;
          for (const app of alist) {
            if (app?.user_id && !appMap.has(app.user_id)) appMap.set(app.user_id, app);
          }
          if (alist.length < 100) break;
          ap++;
        }
      }

      const headers = ['用户名', '姓名', '身份证号', '手机号', '性别', '年龄', '婚姻状况', '工作单位', '人气值', '审核状态', '脱单资料状态'];
      // 照片列：全名单有照片时才有（只导出第一张）
      const photoColStart = headers.length;
      const photoColCount = allData.some((i) => splitPhotos(i.match_profile?.photos).length > 0) ? 1 : 0;
      if (photoColCount) headers.push('照片');
      formFields.forEach(f => headers.push(f.label));
      headers.push('个人主页');
      const profileCol = headers.length - 1;
      const rows: string[][] = [];
      for (const record of allData) {
        const mp = record.match_profile;
        const ds = getDisplayStatus(mp);
        const audit = mp?.audit_status;
        const a = AUDIT_MAP[audit ?? -1] || { color: 'default', text: '-' };
        const row = [
          record.profile.nickname || '-',
          mp?.real_name || '',
          idCardMap[record.user.user_id] || '',
          record.user.phone || '',
          UserGenderLabels[record.profile.gender] || '',
          String(record.profile.age ?? ''),
          mp ? (MaritalStatusLabels[mp.marital_status] || '') : '',
          mp?.workplace || '',
          String(mp?.popularity ?? ''),
          a.text,
          ds.text,
        ];
        // 照片：只导出第一张
        if (photoColCount) row.push(splitPhotos(mp?.photos)[0] || '');
        // 认证表单字段：无认证信息或与申请表单配置不符 → 留空忽略
        const app = appMap.get(record.user.user_id);
        for (const f of formFields) {
          let val = '';
          if (app) {
            let formDataMap: Record<string, any> = {};
            try { formDataMap = JSON.parse(app.form_data || '{}'); } catch { /* ignore */ }
            const attsByField: Record<string, string[]> = {};
            for (const att of (app.attachments || [])) {
              const tag = (att as any).tags || '';
              if (!attsByField[tag]) attsByField[tag] = [];
              attsByField[tag].push(att.url);
            }
            const parts: string[] = [];
            if (formDataMap[f.id] != null) parts.push(String(formDataMap[f.id]));
            parts.push(...(attsByField[f.id] || []));
            val = parts.join(', ');
          }
          row.push(val);
        }
        // 个人主页：user_id 为空时不生成死链接
        row.push(record.user.user_id ? buildProfileUrl(record.user.user_id) : '');
        rows.push(row);
      }
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      // 照片列/个人主页列：列宽 + 单元格链接（照片=超链接，个人主页=HYPERLINK 公式）
      applyLinkColumns(ws, { headers, rowsCount: rows.length, photoColStart, photoColCount, profileCol });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '专区用户');
      XLSX.writeFile(wb, `${zoneName}_用户名单.xlsx`);
      success('导出成功');
    } catch (err: any) {
      showError(err?.response?.data?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const filters: FilterConfig[] = [
    { name: 'keyword', placeholder: '搜索昵称、姓名或手机号', type: 'input' },
  ];

  const columns: ColumnsType<CommunityUserItem> = [
    {
      title: '用户',
      key: 'nickname',
      width: 160,
      render: (_: any, record: CommunityUserItem) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }}
          onClick={() => { setUserDetailUserId(record.user.user_id); setUserDetailVisible(true); }}>
          <Space size={4}>
            <Avatar src={getMediumUrl(record.match_profile?.photos?.[0] || record.profile.avatar)} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{record.profile.nickname || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '姓名',
      key: 'real_name',
      width: 100,
      render: (_: any, record: CommunityUserItem) => (
        <RealNameWithTag name={record.match_profile?.real_name} verified={record.match_profile?.is_real_verified} />
      ),
    },
    {
      title: '手机号',
      key: 'phone',
      width: 140,
      render: (_: any, record: CommunityUserItem) => record.user.phone || '-',
    },
    {
      title: '性别',
      key: 'gender',
      width: 60,
      render: (_: any, record: CommunityUserItem) => UserGenderLabels[record.profile.gender] || '-',
    },
    {
      title: '年龄',
      key: 'age',
      width: 60,
      render: (_: any, record: CommunityUserItem) => record.profile.age ?? '-',
    },
    {
      title: '婚姻状况',
      key: 'marital',
      width: 90,
      render: (_: any, record: CommunityUserItem) =>
        record.match_profile ? (MaritalStatusLabels[record.match_profile.marital_status] || '-') : '-',
    },
    {
      title: '人气值',
      key: 'popularity',
      width: 90,
      align: 'center',
      render: (_: any, record: CommunityUserItem) => record.match_profile?.popularity ?? '-',
    },
    {
      title: '脱单资料状态',
      key: 'status',
      width: 170,
      render: (_: any, record: CommunityUserItem) => {
        const ds = getDisplayStatus(record.match_profile);
        const audit = record.match_profile?.audit_status;
        const a = AUDIT_MAP[audit ?? -1] || { color: 'default', text: '-' };
        return (
          <Space size={4}>
            <Tag color={a.color}>{a.text}</Tag>
            <Tag color={ds.color}>{ds.text}</Tag>
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        <Space style={{ marginLeft: 12, flexShrink: 0 }}>
          <Button icon={<ExportOutlined />} loading={exporting} onClick={handleExport}>导出</Button>
          <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
        </Space>
      </div>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange}
        scroll={{ x: 900 }} rowKey={(r: CommunityUserItem) => r.user.user_id} />

      <UserDetailCardModal
        visible={userDetailVisible}
        userId={userDetailUserId}
        onClose={() => { setUserDetailVisible(false); setUserDetailUserId(''); }}
      />
    </>
  );
};

export default ZoneUsersList;
