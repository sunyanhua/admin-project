import { Switch, Tag, Avatar, Button, Space, Image } from 'antd';
import { formatDateTime } from '@/utils/format';
import { getAvatarUrl, getMediumUrl } from '@/utils/imageUtils';

// ====== Status Switch 列 ======

/**
 * 生成标准状态开关列。
 *
 * @param recordKey - dataIndex/key（默认 'status'）
 * @param enabledValue - 启用对应的值（默认 0）
 * @param disabledValue - 禁用对应的值（默认 1）
 * @param onToggle - 切换回调 (record, checked)
 * @param enabledText - 启用文本
 * @param disabledText - 禁用文本
 * @param width - 列宽（默认 100）
 */
export function statusSwitchColumn<T>(
  recordKey: string = 'status',
  enabledValue: number = 0,
  disabledValue: number = 1,
  onToggle: (record: T, checked: boolean) => void,
  enabledText: string = '启用',
  disabledText: string = '停用',
  width: number = 100,
) {
  return {
    title: '状态',
    dataIndex: recordKey,
    key: recordKey,
    width,
    render: (status: number, record: T) => (
      <Switch
        checked={status === enabledValue}
        onChange={(checked) => onToggle(record, checked)}
        checkedChildren={enabledText}
        unCheckedChildren={disabledText}
      />
    ),
  };
}

// ====== 状态 Tag 列 ======

/**
 * 生成只读状态 Tag 列。
 *
 * @param recordKey - dataIndex/key
 * @param statusMap - Record<number, { text, color }>
 * @param title - 列标题（默认 "状态"）
 * @param width - 列宽（默认 90）
 */
export function statusTagColumn<T>(
  recordKey: string,
  statusMap: Record<number, { text: string; color: string }>,
  title: string = '状态',
  width: number = 90,
) {
  return {
    title,
    dataIndex: recordKey,
    key: recordKey,
    width,
    render: (status: number) => {
      const info = statusMap[status];
      if (!info) return <Tag>{status}</Tag>;
      return <Tag color={info.color} title={info.text}>{info.text}</Tag>;
    },
  };
}

// ====== 日期/时间列 ======

/**
 * 生成标准日期时间列（双行：日期 / 时间，格式 YYYY/MM/DD HH:mm:ss）。
 *
 * @param recordKey - dataIndex
 * @param title - 列标题（默认按 key 推断）
 * @param width - 列宽（默认 120）
 * @param render - 可选自定义渲染（默认 formatDateTime）
 */
export function dateTimeColumn<T>(
  recordKey: string,
  title?: string,
  width: number = 120,
  render?: (value: any, record: T) => React.ReactNode,
) {
  const titleFromKey = recordKey
    .replace(/_/g, ' ')
    .replace(/at\b/, '时间')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: title || titleFromKey,
    dataIndex: recordKey,
    key: recordKey,
    width,
    render: render || ((v: string) => {
      if (!v) return '-';
      try { return formatDateTime(v); } catch { return v; }
    }),
  };
}

// ====== 用户（头像+昵称）列 ======

/**
 * 生成用户头像+昵称列。
 *
 * @param avatarField - 头像字段名（默认 'avatar'）
 * @param nickField - 昵称字段名（默认 'nick'）
 * @param width - 列宽（默认 140）
 * @param onView - 点击回调，传 record
 */
export function userColumn<T extends Record<string, any>>(
  title: string = '用户',
  avatarField: string = 'avatar',
  nickField: string = 'nick',
  width: number = 140,
  onView?: (record: T) => void,
) {
  return {
    title,
    key: 'user',
    width,
    render: (_: any, record: T) => {
      const avatar = record[avatarField] || record.user_data?.[avatarField];
      const nick = record[nickField] || record.user_data?.[nickField] || record.userid || '-';
      const content = (
        <Space size={4}>
          <Avatar src={getAvatarUrl(avatar)} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
          <span style={{ fontSize: 14 }}>{nick}</span>
        </Space>
      );
      if (onView) {
        return (
          <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => onView(record)}>
            {content}
          </Button>
        );
      }
      return content;
    },
  };
}

// ====== 排序 InputNumber 列 ======

/**
 * 生成排序输入列（内联编辑 + 失焦保存）。
 *
 * @param recordIdKey - 记录 ID 字段（默认 'id'）
 * @param onSortChange - 排序变更回调 (id, newValue)
 * @param width - 列宽（默认 120）
 */
export function sortOrderColumn<T extends Record<string, any>>(
  recordIdKey: string = 'id',
  onSortChange: (recordId: number | string, newValue: number) => void,
  width: number = 120,
) {
  return {
    title: '权重',
    dataIndex: 'sort_order',
    key: 'sort_order',
    width,
    render: (value: number | undefined, record: T) => {
      // 避免 InputNumber 受控导致输入跳回旧值（只在失焦时提交）
      let pendingValue: number | undefined;
      return (
        <span
          contentEditable
          suppressContentEditableWarning
          style={{
            display: 'inline-block',
            width: 70,
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 13,
            outline: 'none',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.target as HTMLSpanElement).blur();
            }
          }}
          onFocus={(e) => {
            pendingValue = parseInt(e.target.textContent || '0');
          }}
          onInput={(e) => {
            pendingValue = parseInt(e.target.textContent || '0');
          }}
          onBlur={(e) => {
            const v = parseInt(e.target.textContent || '0');
            if (!isNaN(v) && v !== (value ?? 0)) {
              const id = record[recordIdKey];
              if (id != null) onSortChange(id, v);
            } else {
              e.target.textContent = String(value ?? 0);
            }
          }}
        >
          {value ?? 0}
        </span>
      );
    },
  };
}

// ====== 封面缩略图列 ======

/**
 * 生成封面缩略图列（小图 + 点击预览原图）。
 *
 * @param recordKey - dataIndex（默认 'cover_image'）
 * @param width - 列宽（默认 80）
 */
export function coverColumn<T>(
  recordKey: string = 'cover_image',
  width: number = 80,
) {
  return {
    title: '封面',
    dataIndex: recordKey,
    key: recordKey,
    width,
    render: (url: string) => {
      if (!url) return <span style={{ color: '#999' }}>-</span>;
      return (
        <Image
          src={getMediumUrl(url)}
          preview={{ src: url }}
          style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
        />
      );
    },
  };
}
