import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Space, Tag, Image, Button, Checkbox, Divider, Avatar } from 'antd';
import '../../styles/feed-detail-modal.css';
import { EyeOutlined, CheckOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { feedApi } from '../../api/services/feed';
import { userApi } from '../../api/services/user';
import { FeedStatus } from '@shared/constants/feed.enums';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '../../components/user/UserDetailSections';

const STATUS_MAP: Record<number, string> = {
  [FeedStatus.PENDING]: '待审核',
  [FeedStatus.APPROVED]: '已通过',
  [FeedStatus.REJECTED]: '已屏蔽',
};

const STATUS_OPTIONS = [
  { label: '待审核', value: FeedStatus.PENDING },
  { label: '已通过', value: FeedStatus.APPROVED },
  { label: '已屏蔽', value: FeedStatus.REJECTED },
];

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '全部状态', type: 'select', options: STATUS_OPTIONS },
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

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

const FeedManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailModalData, setDetailModalData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAuditLoading, setDetailAuditLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  const fetchFeeds = useCallback(async (params: any) => {
    return feedApi.getFeeds(params);
  }, []);

  const formatFeedResponse = useCallback((res: any) => ({
    list: res?.data || [],
    count: res?.count ?? 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<any>({
    fetchFn: fetchFeeds,
    formatResponse: formatFeedResponse,
  });
  const { success, error } = useAppNotification();

  const handleViewDetail = async (record: any) => {
    setDetailModalData(null);
    setDetailLoading(true);
    try {
      const res = await feedApi.getFeedDetail(record.id) as any;
      setDetailModalData(res?.data || res || {});
    } catch (error: any) {
      // error handled by useListPage
    } finally {
      setDetailLoading(false);
    }
  };

  // 查看用户详情
  const handleViewUserDetail = async (record: any) => {
    const userid = record.userid || record.user_data?.userid;
    if (!userid) {
      console.warn('No userid found for user detail:', record);
      return;
    }
    setUserDetailLoading(true);
    try {
      const res = await userApi.getUserDetail(userid) as any;
      setUserDetailData(res?.data || res);
      setUserDetailVisible(true);
    } catch (err: any) {
      console.error('Failed to fetch user detail:', err);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const getCoverImage = (image: string): string => {
    if (!image) return '';
    const first = image.split('|')[0];
    return first || '';
  };

  // 快速审核通过
  const handleApprove = async (record: any) => {
    try {
      await feedApi.auditFeed(record.id, FeedStatus.APPROVED);
      success('已通过');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  // 快速屏蔽
  const handleReject = async (record: any) => {
    try {
      const intro = record.intro ? (record.intro.length > 30 ? record.intro.substring(0, 30) + '...' : record.intro) : '';
      await feedApi.auditFeed(record.id, FeedStatus.REJECTED, true, '您的动态已被屏蔽！', `动态内容：${intro}`);
      success('已屏蔽');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  // 详情弹窗审核通过
  const handleDetailApprove = async () => {
    if (!detailModalData) return;
    setDetailAuditLoading(true);
    try {
      await feedApi.auditFeed(detailModalData.id, FeedStatus.APPROVED);
      success('已通过');
      setDetailModalData({ ...detailModalData, status: FeedStatus.APPROVED });
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    } finally {
      setDetailAuditLoading(false);
    }
  };

  // 详情弹窗屏蔽
  const handleDetailReject = async () => {
    if (!detailModalData) return;
    setDetailAuditLoading(true);
    try {
      const intro = detailModalData.intro ? (detailModalData.intro.length > 30 ? detailModalData.intro.substring(0, 30) + '...' : detailModalData.intro) : '';
      await feedApi.auditFeed(detailModalData.id, FeedStatus.REJECTED, true, '您的动态已被屏蔽！', `动态内容：${intro}`);
      success('已屏蔽');
      setDetailModalData({ ...detailModalData, status: FeedStatus.REJECTED });
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    } finally {
      setDetailAuditLoading(false);
    }
  };

  // 标记管理（精华/推荐）
  const handleRecomFlagsChange = async (flag: number, checked: boolean) => {
    if (!detailModalData) return;
    try {
      const currentFlags = detailModalData.recom_flags || 0;
      let newFlags: number;
      if (checked) {
        newFlags = currentFlags | flag;
      } else {
        newFlags = currentFlags & ~flag;
      }
      // 转换为数组格式 [1, 2] 提交
      const flagsArray: number[] = [];
      if (newFlags & 1) flagsArray.push(1);
      if (newFlags & 2) flagsArray.push(2);
      await feedApi.setFeedRecomFlags(detailModalData.id, flagsArray);
      success(checked ? '标记成功' : '取消标记成功');
      setDetailModalData({ ...detailModalData, recom_flags: newFlags });
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  const columns: ColumnsType<any> = [
    {
      title: '封面',
      key: 'cover',
      width: 80,
      render: (_: any, record: any) => {
        const cover = getCoverImage(record.image);
        return cover ? (
          <Image width={60} height={60} src={cover} style={{ borderRadius: 6, objectFit: 'cover' }} />
        ) : '-';
      },
    },
    {
      title: '内容',
      key: 'intro',
      ellipsis: true,
      render: (_: any, record: any) => (
        <Space size={4}>
          <span>{record.intro || '-'}</span>
          {(record.recom_flags & 2) !== 0 && <Tag color="red">推荐</Tag>}
        </Space>
      ),
    },
    {
      title: '发布人',
      key: 'publisher',
      width: 140,
      render: (_: any, record: any) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)}>
          <Space size={4}>
            <Avatar src={record.user_data?.avatar} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{record.user_data?.nick || record.userid || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '发布时间',
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
      width: 90,
      render: (status: number) => {
        const colorMap: Record<number, string> = {
          [FeedStatus.PENDING]: 'orange',
          [FeedStatus.APPROVED]: 'green',
          [FeedStatus.REJECTED]: 'red',
        };
        return <Tag color={colorMap[status] || 'default'}>{STATUS_MAP[status] || '未知'}</Tag>;
      },
    },
    {
      title: '点赞/评论',
      key: 'engagement',
      width: 110,
      render: (_: any, record: any) => (
        <span>
          <span style={{ color: '#fa8c16' }}>{record.likes_total ?? 0}</span>
          <span style={{ color: '#999' }}>/</span>
          <span style={{ color: '#1890ff' }}>{record.comments_total ?? 0}</span>
        </span>
      ),
    },
    ActionColumn({
      onView: handleViewDetail,
      showView: true,
      showEdit: false,
      showDelete: false,
      width: 200,
      render: (record: any) => {
        const status = record.status;
        return (
          <Space size="small">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} className="action-buttons">
              查看
            </Button>
            {status === FeedStatus.PENDING && (
              <>
                <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(record)} className="action-buttons" style={{ color: '#52c41a' }}>
                  通过
                </Button>
                <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleReject(record)} className="action-buttons">
                  屏蔽
                </Button>
              </>
            )}
            {status === FeedStatus.APPROVED && (
              <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleReject(record)} className="action-buttons">
                屏蔽
              </Button>
            )}
            {status === FeedStatus.REJECTED && (
              <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(record)} className="action-buttons" style={{ color: '#52c41a' }}>
                通过
              </Button>
            )}
          </Space>
        );
      },
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

  const d = detailModalData;

  return (
    <>
      <StandardPage
        title="动态发布管理"
        description="管理用户发布的动态内容。"
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
          />
        }
      />

      <DetailModal
        title="动态详情"
        open={!!detailModalData}
        onClose={() => setDetailModalData(null)}
        entity={detailModalData}
        className="feed-detail-modal"
        footer={null}
        render={(entity) => ({
          sections: [
            {
              items: [
                { label: '发布人', value: entity.user_data?.nick || '-' },
                {
                  label: '审核状态',
                  value: (
                    <Tag color={entity.status === FeedStatus.APPROVED ? 'green' : entity.status === FeedStatus.PENDING ? 'orange' : 'red'}>
                      {STATUS_MAP[entity.status] || '未知'}
                    </Tag>
                  ),
                },
                { label: '浏览数', value: entity.viewTotal ?? 0 },
                { label: '点赞数', value: entity.likes_total ?? 0 },
                { label: '评论数', value: entity.comments_total ?? 0 },
                { label: '收藏数', value: entity.favoriteTotal ?? 0 },
                { label: '发布时间', value: formatDateTime(entity.insertat), span: 2 },
                ...(entity.image ? [{
                  label: '图片集',
                  value: (
                    <Space size={8} wrap>
                      {entity.image.split('|').filter(Boolean).map((img: string, idx: number) => (
                        <Image key={idx} width={80} height={80} src={img} style={{ borderRadius: 6, objectFit: 'cover' }} />
                      ))}
                    </Space>
                  ),
                  span: 2 as const,
                }] : []),
                ...(entity.intro ? [{ label: '内容', value: entity.intro, span: 2 as const }] : []),
                {
                  label: '审核操作',
                  span: 2,
                  value: (
                    <Space size="middle">
                      {entity.status === FeedStatus.PENDING && (
                        <>
                          <Button type="link" icon={<CheckOutlined />} loading={detailAuditLoading} onClick={handleDetailApprove} style={{ color: '#52c41a', border: '1px solid #52c41a' }}>
                            通过
                          </Button>
                          <Button type="link" danger icon={<StopOutlined />} loading={detailAuditLoading} onClick={handleDetailReject} style={{ border: '1px solid #ff4d4f' }}>
                            屏蔽
                          </Button>
                        </>
                      )}
                      {entity.status === FeedStatus.APPROVED && (
                        <Button type="link" danger icon={<StopOutlined />} loading={detailAuditLoading} onClick={handleDetailReject} style={{ border: '1px solid #ff4d4f' }}>
                          屏蔽
                        </Button>
                      )}
                      {entity.status === FeedStatus.REJECTED && (
                        <Button type="link" icon={<CheckOutlined />} loading={detailAuditLoading} onClick={handleDetailApprove} style={{ color: '#52c41a', border: '1px solid #52c41a' }}>
                          通过
                        </Button>
                      )}
                    </Space>
                  ),
                },
                ...(entity.status === FeedStatus.APPROVED ? [{
                  label: '标记管理',
                  span: 2,
                  value: (
                    <Space size="middle">
                      <Checkbox
                        checked={(entity.recom_flags & 2) !== 0}
                        onChange={(e) => handleRecomFlagsChange(2, e.target.checked)}
                      >
                        推荐
                      </Checkbox>
                    </Space>
                  ),
                }] : []),
              ],
            },
          ],
        })}
      />

      {/* 用户详情弹窗 */}
      <DetailModal
        title="用户详情"
        open={userDetailVisible}
        onClose={() => setUserDetailVisible(false)}
        entity={userDetailData}
        className="user-detail-modal"
        footer={null}
      >
        {(d: any) => UserDetailSections({ user: d })}
      </DetailModal>
    </>
  );
};

export default FeedManagement;
