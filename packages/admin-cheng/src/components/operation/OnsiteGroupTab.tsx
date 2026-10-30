import { useState, useEffect, useCallback } from 'react';
import { Button, Form, Input, Select, InputNumber, Space, Empty, Spin } from 'antd';
import { SaveOutlined, TeamOutlined, HolderOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { activityApi, Activity, RegisterRecord } from '@/api/services/activity-v1';
import { RegisterAuditStatus, RegisterGenderLabels } from '@shared/constants';
import {
  parseGroupNames,
  parseGroupIndex,
  autoAssignGroups,
  GROUP_INDEX_KEY,
  GROUP_NAME_KEY,
} from './onsiteGrouping.utils';

interface OnsiteGroupTabProps {
  activityId: string;
  /** 列表行数据（与现场配置 TAB 同源）；缺省时用详情接口兜底 */
  activity?: Activity | null;
}

/** 分组成员展示行 */
interface MemberRow extends RegisterRecord {
  /** 当前分组序号（0 起；null=未分组） */
  groupIdx: number | null;
}

/**
 * 分组管理 TAB：
 * - 分组名称配置（"|" 分隔，存 onsite_config.groups，原对象透传）
 * - 分组列表：每组一列，成员卡片显示序号/昵称/姓名/性别/年龄，支持拖拽移动分组
 * - 「自动分组」：全部已入选用户按人数平均 + 男女人数平均自动分配
 * - 「保存分组」：逐条 PATCH 报名 extra_data（JSON 原对象透传 + group_index/group_name）
 */
const OnsiteGroupTab: React.FC<OnsiteGroupTabProps> = ({ activityId, activity: activityProp }) => {
  const { success, error: showError } = useAppNotification();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  /** 最近一次读取的活动原始数据（保存时 onsite_config 原对象透传） */
  const [activity, setActivity] = useState<any>(activityProp || null);
  /** 已保存的分组名称 */
  const [groups, setGroups] = useState<string[]>([]);
  /** 已入选报名记录与当前分组序号 */
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  /** 快速设置：组名类型（字母/数字）与组数 */
  const [quickType, setQuickType] = useState<'letter' | 'number'>('letter');
  const [quickCount, setQuickCount] = useState<number | null>(null);
  /** 拖拽中：dragUid 为被拖动成员，dragOverIdx 为悬停目标组 */
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const resetDrag = () => { setDragUid(null); setDragOverIdx(null); };

  /** 快速设置：按类型与组数自动生成分组名称（字母 A|B|C… 或数字 1|2|3…） */
  const applyQuickSet = () => {
    if (quickCount == null || quickCount < 1 || quickCount > 26) {
      showError('请输入 1~26 的组数');
      return;
    }
    const names = Array.from({ length: quickCount }, (_, i) =>
      quickType === 'letter' ? String.fromCharCode(65 + i) : String(i + 1),
    );
    form.setFieldValue('groups', names.join('|'));
  };

  const fillGroups = useCallback((data: any) => {
    try {
      const obj = JSON.parse(data?.onsite_config || '{}');
      const raw = obj && typeof obj === 'object' && typeof obj.groups === 'string' ? obj.groups : '';
      setGroups(parseGroupNames(raw));
      form.setFieldValue('groups', raw);
    } catch { setGroups([]); }
  }, [form]);

  // 列表数据优先：延迟回填（等表单挂载）
  useEffect(() => {
    if (!activityProp) return;
    setActivity(activityProp);
    const timer = setTimeout(() => fillGroups(activityProp), 50);
    return () => clearTimeout(timer);
  }, [activityProp, fillGroups]);

  /** 详情接口兜底（列表未传数据时） */
  const fetchConfig = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    try {
      const res: any = await activityApi.getDetail(activityId);
      setActivity(res);
      fillGroups(res);
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取分组配置失败');
    } finally {
      setLoading(false);
    }
  }, [activityId, fillGroups, showError]);

  useEffect(() => {
    if (activityProp) return;
    fetchConfig();
  }, [activityProp, fetchConfig]);

  /** 拉取全部已入选报名并读取各自分组（extra_data.group_index） */
  const fetchMembers = useCallback(async () => {
    if (!activityId) return;
    setMembersLoading(true);
    try {
      const all: RegisterRecord[] = [];
      let page = 1;
      while (true) {
        const res: any = await activityApi.getRegisters(activityId, { page, size: 100, audit_status: RegisterAuditStatus.APPROVED });
        const list: RegisterRecord[] = Array.isArray(res) ? res : (res?.list || []);
        if (!list.length) break;
        all.push(...list);
        if (list.length < 100) break;
        page++;
      }
      // user_id 可为 null（免报名入选），空安全比较避免排序崩溃
      const byNumber = (a: RegisterRecord, b: RegisterRecord) =>
        (a.onsite_number ?? Number.MAX_SAFE_INTEGER) - (b.onsite_number ?? Number.MAX_SAFE_INTEGER)
        || String(a.user_id || '').localeCompare(String(b.user_id || ''));
      all.sort(byNumber);
      const rows: MemberRow[] = all.map((r) => {
        const idx = parseGroupIndex(r.extra_data);
        return { ...r, groupIdx: idx != null && idx >= 1 && idx <= groups.length ? idx - 1 : null };
      });
      setMembers(rows);
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取成员列表失败');
    } finally {
      setMembersLoading(false);
    }
  }, [activityId, groups.length, showError]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /** 保存分组名称：onsite_config 原对象透传 + 仅管理 groups 键 */
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const raw = String(values.groups ?? '').trim();
      const segments = raw.split('|').map((s) => s.trim());
      if (!raw) {
        showError('请输入分组名称');
        return;
      }
      if (segments.some((s) => !s)) {
        showError('分组名称不能为空段（检查连续或首尾的分隔符）');
        return;
      }
      setSaving(true);

      let obj: Record<string, any> = {};
      try {
        const parsed = JSON.parse(activity?.onsite_config || '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed;
      } catch { /* 原值非法则从空对象开始 */ }
      obj.groups = raw;

      await activityApi.update(activityId, { onsite_config: JSON.stringify(obj) });
      success('分组配置已保存');
      await fetchConfig();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  /** 成员唯一键：免报名入选记录 user_id 为空串，退化为报名记录 id 避免键冲突 */
  const uidOf = (m: RegisterRecord) => m.user_id || m.id;

  /** 自动分组：全部已入选用户按人数平均 + 男女人数平均分配（基于最新成员状态计算） */
  const handleAutoAssign = () => {
    if (!groups.length) {
      showError('请先保存分组名称');
      return;
    }
    if (!members.length) {
      showError('成员列表尚未加载完成，请稍后重试');
      return;
    }
    setMembers((prev) => {
      const map = autoAssignGroups(
        prev.map((m) => ({
          userId: uidOf(m),
          gender: (m.user_profile?.gender ?? m.gender) === 1 ? 'male' : (m.user_profile?.gender ?? m.gender) === 2 ? 'female' : '',
          number: m.onsite_number,
        })),
        groups.length,
      );
      return prev.map((m) => ({ ...m, groupIdx: map.get(uidOf(m)) ?? null }));
    });
    success('自动分组完成，可继续手动拖拽调整');
  };

  /** 拖拽落组：把被拖动成员移动到目标组 */
  const handleDrop = (targetIdx: number) => {
    if (dragUid == null) { resetDrag(); return; }
    setMembers((prev) => prev.map((m) => (uidOf(m) === dragUid ? { ...m, groupIdx: targetIdx } : m)));
    resetDrag();
  };

  /** 保存分组：逐条 PATCH extra_data（JSON 原对象透传 + group_index/group_name） */
  const handleSaveAssign = async () => {
    if (!groups.length) {
      showError('请先保存分组名称');
      return;
    }
    const targets = members.filter((m) => m.groupIdx != null);
    if (!targets.length) {
      showError('暂无已分配分组的成员');
      return;
    }
    setSavingAssign(true);
    setSavingProgress(0);
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const m = targets[i];
      try {
        let obj: Record<string, any> = {};
        try {
          const parsed = JSON.parse(m.extra_data || '{}');
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) obj = parsed;
        } catch { /* 原值非法则从空对象开始 */ }
        obj[GROUP_INDEX_KEY] = (m.groupIdx as number) + 1;
        obj[GROUP_NAME_KEY] = groups[m.groupIdx as number];
        await activityApi.updateRegisterExtraData(activityId, m.id, JSON.stringify(obj));
        ok++;
      } catch { fail++; } // 单条失败静默计数
      setSavingProgress(i + 1);
    }
    setSavingAssign(false);
    setSavingProgress(0);
    success(`分组保存完成：成功 ${ok} 条，失败 ${fail} 条`);
    fetchMembers();
  };

  /** 组内男女人数统计 */
  const statsOf = (idx: number | null) => {
    const list = members.filter((m) => m.groupIdx === idx);
    const genderOf = (m: RegisterRecord) => m.user_profile?.gender ?? m.gender;
    const males = list.filter((m) => genderOf(m) === 1).length;
    const females = list.filter((m) => genderOf(m) === 2).length;
    return { total: list.length, males, females };
  };

  /** 成员卡片展示资料 */
  const infoOf = (m: RegisterRecord) => ({
    number: m.onsite_number ?? null,
    nickname: m.user_profile?.nickname || m.nickname || m.user_id,
    realName: m.user_match_profile?.real_name || '',
    genderLabel: (() => {
      const g = m.user_profile?.gender ?? m.gender ?? m.presign_gender;
      return g != null ? (RegisterGenderLabels[g] ?? '-') : '-';
    })(),
    age: m.user_profile?.age ?? m.age ?? null,
  });

  return (
    <div>
      <Form form={form} layout="vertical" style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Form.Item
            label="分组名称"
            name="groups"
            rules={[{ required: true, message: '请输入分组名称' }]}
            extra='用「|」分隔，例如：A|B|C|D|E|F|G'
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Input placeholder="A|B|C|D|E|F|G" maxLength={512} />
          </Form.Item>
          <Button type="primary" icon={<SaveOutlined />} loading={saving || loading} onClick={handleSave} style={{ marginTop: 30 }}>
            保存
          </Button>
        </div>

        {/* 快速设置：按类型与组数自动生成分组名称 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14, fontSize: 13, color: '#666' }}>
          <span>快速设置</span>
          <Select
            size="small"
            value={quickType}
            onChange={(v) => setQuickType(v)}
            style={{ width: 84 }}
            options={[
              { label: '字母', value: 'letter' },
              { label: '数字', value: 'number' },
            ]}
          />
          <InputNumber
            size="small"
            min={1}
            max={26}
            precision={0}
            value={quickCount ?? undefined}
            onChange={(v) => setQuickCount(v ?? null)}
            placeholder="组数"
            style={{ width: 84 }}
          />
          <Button size="small" onClick={applyQuickSet}>应用</Button>
          <span style={{ color: '#999' }}>如字母 + 7 → A|B|C|D|E|F|G</span>
        </div>
      </Form>

      {/* ====== 分组列表 ====== */}
      <div style={{ height: 1, background: '#e8e8e8', margin: '16px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>分组列表</div>
        <Space>
          <Button icon={<TeamOutlined />} disabled={membersLoading} onClick={handleAutoAssign}>自动分组</Button>
          <Button type="primary" loading={savingAssign} onClick={handleSaveAssign}>
            {savingAssign ? `保存分组中 ${savingProgress}/${members.filter((m) => m.groupIdx != null).length}` : '保存分组'}
          </Button>
        </Space>
      </div>

      <Spin spinning={membersLoading}>
        {!groups.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先保存分组名称" style={{ padding: '24px 0' }} />
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {groups.map((name, idx) => {
              const stats = statsOf(idx);
              return (
                <div
                  key={`${name}-${idx}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragUid !== null && dragOverIdx !== idx) setDragOverIdx(idx);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverIdx((cur) => (cur === idx ? null : cur));
                    }
                  }}
                  onDrop={() => handleDrop(idx)}
                  style={{
                    minWidth: 210,
                    flex: '0 0 210px',
                    border: dragOverIdx === idx && dragUid !== null ? '1px dashed #1677ff' : '1px solid #e8e8e8',
                    borderRadius: 8,
                    background: '#fafafa',
                    padding: 10,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{name} 组</span>
                    <span style={{ fontSize: 12, color: '#666', fontWeight: 400 }}>
                      男{stats.males} 女{stats.females} 共{stats.total}
                    </span>
                  </div>
                  {members.filter((m) => m.groupIdx === idx).map((m) => {
                    const info = infoOf(m);
                    return (
                      <div
                        key={uidOf(m)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', uidOf(m));
                          setDragUid(uidOf(m));
                        }}
                        onDragEnd={resetDrag}
                        title="拖拽可移动到其他组"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff',
                          padding: '6px 8px', marginBottom: 6, cursor: 'grab',
                          opacity: dragUid === m.user_id ? 0.5 : 1,
                        }}
                      >
                        <HolderOutlined style={{ color: '#bbb', flexShrink: 0 }} />
                        <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: '#e04d2c', color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {info.number ?? '-'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {info.nickname}（{info.genderLabel}）
                          </div>
                          <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {info.realName || '-'} · {info.age != null ? `${info.age}岁` : '年龄-'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {members.filter((m) => m.groupIdx === idx).length === 0 && (
                    <div style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '12px 0' }}>暂无成员（可拖入）</div>
                  )}
                </div>
              );
            })}

            {/* 未分组列 */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragUid !== null && dragOverIdx !== -1) setDragOverIdx(-1);
              }}
              onDrop={() => {
                if (dragUid == null) return;
                setMembers((prev) => prev.map((m) => (m.user_id === dragUid ? { ...m, groupIdx: null } : m)));
                resetDrag();
              }}
              style={{
                minWidth: 210,
                flex: '0 0 210px',
                border: dragOverIdx === -1 && dragUid !== null ? '1px dashed #1677ff' : '1px solid #e8e8e8',
                borderRadius: 8,
                background: '#f5f5f5',
                padding: 10,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>未分组</span>
                <span style={{ fontSize: 12, color: '#666', fontWeight: 400 }}>共{statsOf(null).total}</span>
              </div>
              {members.filter((m) => m.groupIdx === null).map((m) => {
                const info = infoOf(m);
                return (
                  <div
                    key={uidOf(m)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', uidOf(m));
                      setDragUid(uidOf(m));
                    }}
                    onDragEnd={resetDrag}
                    title="拖拽可移动到其他组"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      border: '1px solid #f0f0f0', borderRadius: 6, background: '#fff',
                      padding: '6px 8px', marginBottom: 6, cursor: 'grab',
                      opacity: dragUid === m.user_id ? 0.5 : 1,
                    }}
                  >
                    <HolderOutlined style={{ color: '#bbb', flexShrink: 0 }} />
                    <span style={{ minWidth: 22, height: 22, borderRadius: '50%', background: '#e04d2c', color: '#fff', fontSize: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {info.number ?? '-'}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {info.nickname}（{info.genderLabel}）
                      </div>
                      <div style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {info.realName || '-'} · {info.age != null ? `${info.age}岁` : '年龄-'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Spin>
    </div>
  );
};

export default OnsiteGroupTab;
