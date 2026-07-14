import { useState, useCallback } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Button, Space, Tag, Typography, Avatar, Image, Checkbox } from 'antd';
import { EyeOutlined, DeleteOutlined, CheckOutlined, StopOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { feedApi } from '../../api/services/feed';
import { userApi } from '../../api/services/user';
import { MomentAuditStatus } from '@shared/constants/moment.enums';
import { FeedStatus } from '@shared/constants/feed.enums';
import { useListPage } from '@/hooks/useListPage';
import { StandardPage } from '@/components/templates/StandardPage';
import { StandardTable } from '@/components/templates/StandardTable';
import { ActionColumn } from '@/components/templates/ActionColumn';
import { SearchPanel, FilterConfig } from '@/components/templates/SearchPanel';
import { DetailModal } from '@/components/templates/DetailModal';
import UserDetailSections from '../../components/user/UserDetailSections';
import { formatDateTime, formatDate } from '@/utils/format';

const { Title } = Typography;

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  [MomentAuditStatus.PENDING]: { text: '待审核', color: 'orange' },
  [MomentAuditStatus.APPROVED]: { text: '已通过', color: 'green' },
  [MomentAuditStatus.REJECTED]: { text: '已屏蔽', color: 'red' },
};

const FEED_STATUS_MAP: Record<number, { text: string; color: string }> = {
  [FeedStatus.PENDING]: { text: '待审核', color: 'orange' },
  [FeedStatus.APPROVED]: { text: '已通过', color: 'green' },
  [FeedStatus.REJECTED]: { text: '已屏蔽', color: 'red' },
  [FeedStatus.LOCKED]: { text: '已锁定', color: 'default' },
};

const filters: FilterConfig[] = [
  { name: 'status', placeholder: '审核状态', type: 'select', options: [
    { label: '待审核', value: MomentAuditStatus.PENDING },
    { label: '已通过', value: MomentAuditStatus.APPROVED },
    { label: '已屏蔽', value: MomentAuditStatus.REJECTED },
  ]},
  { name: 'word', placeholder: '关键词搜索', type: 'input' },
];

interface Comment {
  id: number;
  userid?: string;
  intro: string;
  user_data?: {
    userid?: string;
    nick?: string;
    avatar?: string;
  };
  feed_id?: number;
  feed_data?: {
    id?: number;
    brief?: string;
    intro?: string;
    image?: string;
    user_data?: {
      nick?: string;
      avatar?: string;
    };
  };
  status: number;
  insertat: string;
  likes_total: number;
  comments_total: number;
}

const CommentManagement = () => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [detailModalData, setDetailModalData] = useState<any>(null);
  const [detailAuditLoading, setDetailAuditLoading] = useState(false);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [feedDetailVisible, setFeedDetailVisible] = useState(false);
  const [feedDetailData, setFeedDetailData] = useState<any>(null);
  const [feedDetailLoading, setFeedDetailLoading] = useState(false);

  const fetchComments = useCallback(async (params: any) => {
    return feedApi.getComments(params);
  }, []);

  const formatCommentResponse = useCallback((res: any) => ({
    list: res?.data?.list || res?.data || [],
    count: res?.data?.count || res?.count || 0,
  }), []);

  const { data, loading, pagination, onPageChange, refresh, search } = useListPage<Comment>({
    fetchFn: fetchComments,
    formatResponse: formatCommentResponse,
  });
  const { success, error } = useAppNotification();

  const handleDelete = async (record: Comment) => {
    try {
      await feedApi.deleteComment(record.id);
      success('删除成功');
      refresh();
    } catch (error: any) {
      error(error.response?.data?.msg || '删除失败');
    }
  };

  // 审核通过
  const handleApprove = async (record: Comment) => {
    try {
      await feedApi.auditComment(record.id, MomentAuditStatus.APPROVED);
      success('已通过');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  // 审核屏蔽
  const handleReject = async (record: Comment) => {
    try {
      await feedApi.auditComment(record.id, MomentAuditStatus.REJECTED);
      success('已屏蔽');
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    }
  };

  // 查看用户详情
  const handleViewUserDetail = async (record: Comment) => {
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

  const handleViewDetail = (record: Comment) => {
    setDetailModalData(record);
  };

  // 查看动态详情
  const handleViewFeedDetail = async (record: Comment) => {
    const feedId = record.feed_id || record.feed_data?.id;
    if (!feedId) {
      console.warn('No feed id found:', record);
      return;
    }
    setFeedDetailLoading(true);
    try {
      const res = await feedApi.getFeedDetail(feedId) as any;
      setFeedDetailData(res?.data || res);
      setFeedDetailVisible(true);
    } catch (err: any) {
      console.error('Failed to fetch feed detail:', err);
    } finally {
      setFeedDetailLoading(false);
    }
  };

  // 详情弹窗审核通过
  const handleDetailApprove = async () => {
    if (!detailModalData) return;
    setDetailAuditLoading(true);
    try {
      await feedApi.auditComment(detailModalData.id, MomentAuditStatus.APPROVED);
      success('已通过');
      setDetailModalData({ ...detailModalData, status: MomentAuditStatus.APPROVED });
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
      await feedApi.auditComment(detailModalData.id, MomentAuditStatus.REJECTED);
      success('已屏蔽');
      setDetailModalData({ ...detailModalData, status: MomentAuditStatus.REJECTED });
      refresh();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    } finally {
      setDetailAuditLoading(false);
    }
  };

  const columns: ColumnsType<Comment> = [
    {
      title: '内容',
      dataIndex: 'intro',
      key: 'intro',
      ellipsis: true,
    },
    {
      title: '发布人',
      key: 'author',
      width: 140,
      render: (_: any, record: Comment) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewUserDetail(record)}>
          <Space size={4}>
            <Avatar src={record.user_data?.avatar} size={40} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <span style={{ fontSize: 14 }}>{record.user_data?.nick || '-'}</span>
          </Space>
        </Button>
      ),
    },
    {
      title: '所属动态',
      key: 'feed',
      ellipsis: true,
      width: 150,
      render: (_: any, record: Comment) => (
        <Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => handleViewFeedDetail(record)}>
          {record.feed_data?.intro || '-'}
        </Button>
      ),
    },
    {
      title: '审核状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: number) => (
        <Tag color={STATUS_MAP[status]?.color}>
          {STATUS_MAP[status]?.text}
        </Tag>
      ),
    },
    {
      title: '点赞/评论',
      key: 'engagement',
      width: 110,
      render: (_: any, record: Comment) => (
        <span>
          <span style={{ color: '#fa8c16' }}>{record.likes_total ?? 0}</span>
          <span style={{ color: '#999' }}>/</span>
          <span style={{ color: '#1890ff' }}>{record.comments_total ?? 0}</span>
        </span>
      ),
    },
    {
      title: '时间',
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
    ActionColumn({
      onView: handleViewDetail,
      showView: true,
      showEdit: false,
      showDelete: false,
      width: 200,
      render: (record: Comment) => {
        const status = record.status;
        return (
          <Space size="small">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} className="action-buttons">
              查看
            </Button>
            {status === MomentAuditStatus.PENDING && (
              <>
                <Button type="link" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(record)} className="action-buttons" style={{ color: '#52c41a' }}>
                  通过
                </Button>
                <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleReject(record)} className="action-buttons">
                  屏蔽
                </Button>
              </>
            )}
            {status === MomentAuditStatus.APPROVED && (
              <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleReject(record)} className="action-buttons">
                屏蔽
              </Button>
            )}
            {status === MomentAuditStatus.REJECTED && (
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

  return (
    <>
    <StandardPage
      title="评论管理"
      description="管理动态评论内容。"
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
      title="评论详情"
      open={!!detailModalData}
      onClose={() => setDetailModalData(null)}
      entity={detailModalData}
      footer={null}
      render={(entity) => ({
        sections: [
          {
            items: [
              { label: '发布人', value: entity?.user_data?.nick || '-' },
              {
                label: '审核状态',
                value: (
                  <Tag color={entity?.status === MomentAuditStatus.APPROVED ? 'green' : entity?.status === MomentAuditStatus.PENDING ? 'orange' : 'red'}>
                    {STATUS_MAP[entity?.status]?.text || '未知'}
                  </Tag>
                ),
              },
              { label: '点赞', value: entity?.likes_total ?? 0 },
              { label: '评论', value: entity?.comments_total ?? 0 },
              { label: '发布时间', value: formatDateTime(entity?.insertat), span: 2 },
              ...(entity?.intro ? [{ label: '内容', value: entity.intro, span: 2 as const }] : []),
              {
                label: '审核操作',
                span: 2,
                value: (
                  <Space size="middle">
                    {entity?.status === MomentAuditStatus.PENDING && (
                      <>
                        <Button type="link" icon={<CheckOutlined />} loading={detailAuditLoading} onClick={handleDetailApprove} style={{ color: '#52c41a', border: '1px solid #52c41a' }}>
                          通过
                        </Button>
                        <Button type="link" danger icon={<StopOutlined />} loading={detailAuditLoading} onClick={handleDetailReject} style={{ border: '1px solid #ff4d4f' }}>
                          屏蔽
                        </Button>
                      </>
                    )}
                    {entity?.status === MomentAuditStatus.APPROVED && (
                      <Button type="link" danger icon={<StopOutlined />} loading={detailAuditLoading} onClick={handleDetailReject} style={{ border: '1px solid #ff4d4f' }}>
                        屏蔽
                      </Button>
                    )}
                    {entity?.status === MomentAuditStatus.REJECTED && (
                      <Button type="link" icon={<CheckOutlined />} loading={detailAuditLoading} onClick={handleDetailApprove} style={{ color: '#52c41a', border: '1px solid #52c41a' }}>
                        通过
                      </Button>
                    )}
                  </Space>
                ),
              },
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

    {/* 动态详情弹窗 */}
    <DetailModal
      title="动态详情"
      open={feedDetailVisible}
      onClose={() => setFeedDetailVisible(false)}
      entity={feedDetailData}
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
                    {FEED_STATUS_MAP[entity.status]?.text || '未知'}
                  </Tag>
                ),
              },
              { label: '浏览数', value: entity.viewTotal ?? 0 },
              { label: '点赞数', value: entity.likesTotal ?? 0 },
              { label: '评论数', value: entity.commentsTotal ?? 0 },
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
            ],
          },
        ],
      })}
    />
    </>
  );
};

export default CommentManagement;
