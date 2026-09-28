import { useState, useCallback, useEffect, useRef } from 'react';
import { Button, Space, Tag, Upload, Modal } from 'antd';
import { DownloadOutlined, ImportOutlined, UserAddOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import * as XLSX from 'xlsx';
import { useAppNotification } from '@/hooks/useAppNotification';
import { useListPage } from '@/hooks/useListPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { dateTimeColumn } from '@/components/templates/ColumnHelpers';
import { activityApi, PresignRecord, ImportPresignItem } from '@/api/services/activity-v1';
import { PresignStatus, PresignStatusLabels, UserGender, UserGenderLabels } from '@/api/types/status';

interface ActivityPresignTabProps {
  activityId: string;
  /** 报名名单弹窗打开次数（弹窗重开时刷新列表） */
  reloadKey: number;
}

/** 导入模版表头（与导入解析共用，前 3 列映射接口字段，其余打包进 presign_data） */
const TEMPLATE_HEADERS = [
  '姓名', '手机号', '性别', '婚姻状况', '学历', '职业', '工作单位', '身高', '体重',
  '生肖', '血型', '民族', '所在区县', '户籍', '家乡', '毕业学校', '收入范围', '身份证号',
  '兴趣爱好', '才艺特长', '自我介绍', '择偶要求',
] as const;

/** 打包进 presign_data 的列（姓名/手机号/性别之后的所有列） */
const PRESIGN_DATA_KEYS = TEMPLATE_HEADERS.slice(3);

/** 性别文案 → 接口枚举（男 1 / 女 2 / 其他 0 未设置） */
function parseGender(v: unknown): number {
  const s = String(v ?? '').trim();
  if (s === '男' || s === '1') return UserGender.MALE;
  if (s === '女' || s === '2') return UserGender.FEMALE;
  return UserGender.UNSET;
}

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select',
    options: [
      { label: '未报名', value: PresignStatus.NOT_REGISTERED },
      { label: '已报名', value: PresignStatus.REGISTERED },
    ],
  },
  { name: 'keyword', placeholder: '搜索姓名、手机号', type: 'input' },
];

const ActivityPresignTab: React.FC<ActivityPresignTabProps> = ({ activityId, reloadKey }) => {
  const { success, error: showError, warning: showWarning } = useAppNotification();
  const [searchValues, setSearchValues] = useState<Record<string, any>>({});
  const [importing, setImporting] = useState(false);
  /** 正在执行「免报名入选」的记录 id（按钮 loading） */
  const [registeringIds, setRegisteringIds] = useState<Set<string>>(new Set());

  const fetchPresigns = useCallback(async (params: any) => {
    if (!activityId) return { list: [], total: 0 };
    return activityApi.getPresigns(activityId, {
      page: params.page, size: params.page_size,
      status: params.status != null ? params.status : undefined,
      keyword: params.keyword || undefined,
    });
  }, [activityId]);

  const formatResponse = useCallback((res: any) => {
    const list = Array.isArray(res) ? res : (res?.list || []);
    const total = Array.isArray(res) ? res.length : (res?.total ?? 0);
    return { list, count: total };
  }, []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<PresignRecord>({
    fetchFn: fetchPresigns,
    formatResponse,
  });

  // 挂载时 useListPage 已首拉；活动切换或弹窗重开（reloadKey 变化）时重新拉取
  const prevKeyRef = useRef(activityId ? `${activityId}-${reloadKey}` : '');
  useEffect(() => {
    const key = `${activityId}-${reloadKey}`;
    if (activityId && key !== prevKeyRef.current) {
      prevKeyRef.current = key;
      search({ _t: Date.now() });
    }
  }, [activityId, reloadKey, search]);

  const handleSearchChange = (name: string, value: any) => setSearchValues(p => ({ ...p, [name]: value }));
  const handleSearch = (vals: Record<string, any>) => search(vals);
  const handleReset = () => { setSearchValues({}); search({}); };

  /** 下载导入模版（仅表头行） */
  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS]]);
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '报名导入模版');
    XLSX.writeFile(wb, '报名导入模版.xlsx');
  };

  /** 解析 Excel 并导入（手机号空行跳过；超过 100 条自动分片） */
  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

      const items: ImportPresignItem[] = [];
      for (const row of rows) {
        const phone = String(row['手机号'] ?? '').trim();
        if (!phone) continue;
        const extra: Record<string, string> = {};
        for (const key of PRESIGN_DATA_KEYS) {
          const val = String(row[key] ?? '').trim();
          if (val) extra[key] = val;
        }
        const realName = String(row['姓名'] ?? '').trim();
        items.push({
          phone,
          real_name: realName || undefined,
          gender: parseGender(row['性别']),
          presign_data: Object.keys(extra).length ? JSON.stringify(extra) : undefined,
        });
      }
      if (!items.length) {
        showWarning('没有可导入的数据（手机号列为空）');
        return;
      }
      let created = 0;
      let skipped = 0;
      for (let i = 0; i < items.length; i += 100) {
        const res: any = await activityApi.importPresigns(activityId, items.slice(i, i + 100));
        created += res?.created ?? 0;
        skipped += res?.skipped ?? 0;
      }
      success(`导入完成：新增 ${created} 条，跳过 ${skipped} 条`);
      refresh();
    } catch (err: any) {
      showError(err?.response?.data?.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  /** 免报名入选：预报名一键转为报名记录并审核通过（二次确认） */
  const handleRegisterPresign = (record: PresignRecord) => {
    const name = record.real_name || record.phone || '';
    Modal.confirm({
      title: '确认免报名入选',
      content: `确认将「${name}」免报名入选该活动？操作后将生成报名记录并直接审核通过。`,
      okText: '确认入选',
      cancelText: '取消',
      onOk: async () => {
        setRegisteringIds((prev) => new Set(prev).add(record.id));
        try {
          await activityApi.registerPresign(activityId, record.id);
          success('免报名入选成功');
          refresh();
        } catch (err: any) {
          showError(err?.response?.data?.message || '操作失败');
        } finally {
          setRegisteringIds((prev) => {
            const next = new Set(prev);
            next.delete(record.id);
            return next;
          });
        }
      },
    });
  };

  const columns: ColumnsType<PresignRecord> = [
    {
      title: '姓名',
      dataIndex: 'real_name',
      key: 'real_name',
      width: 100,
      render: (v: string) => v || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (v: string) => v || <span style={{ color: '#999' }}>-</span>,
    },
    {
      title: '性别',
      dataIndex: 'gender',
      key: 'gender',
      width: 70,
      render: (v: number | undefined) => (v != null ? (UserGenderLabels[v] ?? '-') : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (_: number | undefined, r: PresignRecord) => {
        const s = r.status ?? PresignStatus.NOT_REGISTERED;
        // 已免报名入选（后台一键报名，无用户绑定）：status 已报名但 user_id 为空，单独文案与颜色
        if (s === PresignStatus.REGISTERED && !r.user_id) {
          return <Tag color="processing" title="已免报名入选">已免报名入选</Tag>;
        }
        return <Tag color={s === PresignStatus.REGISTERED ? 'success' : 'default'}>{PresignStatusLabels[s] ?? s}</Tag>;
      },
    },
    dateTimeColumn<PresignRecord>('created_at', '导入时间'),
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, r: PresignRecord) => {
        // 已报名入选（register_id 非空或 status 已报名）：操作显示 -
        const isRegistered = !!r.register_id || (r.status ?? PresignStatus.NOT_REGISTERED) !== PresignStatus.NOT_REGISTERED;
        if (isRegistered) {
          return <span style={{ color: '#999' }}>-</span>;
        }
        return (
          <Button type="link" size="small" icon={<UserAddOutlined />} loading={registeringIds.has(r.id)}
            onClick={() => handleRegisterPresign(r)}>免报名入选</Button>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SearchPanel filters={filters} values={searchValues} onChange={handleSearchChange} onSearch={handleSearch} onReset={handleReset} />
        <Space style={{ marginLeft: 12, flexShrink: 0 }}>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模版</Button>
          <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={(file) => { handleImportFile(file); return false; }}>
            <Button icon={<ImportOutlined />} loading={importing}>导入报名</Button>
          </Upload>
        </Space>
      </div>
      <StandardTable columns={columns} dataSource={data} loading={loading} pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
};

export default ActivityPresignTab;
