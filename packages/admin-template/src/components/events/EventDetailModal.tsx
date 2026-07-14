import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Modal, Descriptions, Tag, Space, Image, Avatar, Button, Form, Input, Upload, DatePicker } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { eventApi } from '@/api/services/event';
import { EventStatus } from '@shared/constants/event.enums';
import { formatDateTime } from '@/utils/format';
import { useAppNotification } from '@/hooks/useAppNotification';
import ImageUpload from '@/components/common/ImageUpload';
import { uploadApi } from '@/api/services/upload';

interface EventDetailModalProps {
  eventId: number;
  open: boolean;
  onClose: () => void;
  showLockButton?: boolean;
  showEditButton?: boolean;
  onLock?: (id: number) => void;
  detailData?: any;
  onApprove?: (id: number) => void;
  onUpdate?: (updated: any) => void;
  onRefresh?: () => void;
}

const STATUS_MAP: Record<number, { text: string; color: string }> = {
  1: { text: '进行中', color: 'blue' },
  2: { text: '未通过', color: 'red' },
  3: { text: '已锁定', color: 'default' },
  4: { text: '已取消', color: 'default' },
  5: { text: '已退款取消', color: 'orange' },
  6: { text: '已完成', color: 'green' },
};

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  eventId,
  open,
  onClose,
  showLockButton = false,
  showEditButton,
  onLock,
  detailData,
  onApprove,
  onUpdate,
  onRefresh,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();
  const [multiImages, setMultiImages] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const { success, error } = useAppNotification();

  useEffect(() => {
    if (open && eventId) {
      if (detailData) {
        setData(detailData);
      } else {
        fetchEventDetail();
      }
    }
  }, [open, eventId, detailData]);

  const fetchEventDetail = async () => {
    setLoading(true);
    try {
      const res = await eventApi.getEventDetail(eventId) as any;
      setData(res?.data || res || {});
    } catch (err) {
      console.error('Failed to fetch event detail:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!data || !onApprove) return;
    onApprove(data.id);
  };

  const handleLock = () => {
    if (!data || !onLock) return;
    onLock(data.id);
  };

  const handleOpenEdit = () => {
    if (!data) return;
    const imgs = data.arg_0 ? data.arg_0.split('|').filter(Boolean) : [];
    setMultiImages(imgs);
    editForm.setFieldsValue({
      title: data.title,
      image: data.image || '',
      intro: data.intro,
      arg_0: data.arg_0 || '',
      start_time: data.start_time ? dayjs(data.start_time) : null,
      reg_expiry: data.reg_expiry ? dayjs(data.reg_expiry) : null,
      refund_expiry: data.refund_expiry ? dayjs(data.refund_expiry) : null,
    });
    setEditModalVisible(true);
  };

  const handleEditSubmit = async () => {
    if (!data) return;
    try {
      const vals = await editForm.validateFields();
      setEditLoading(true);
      const payload = {
        ...vals,
        arg_0: multiImages.join('|'),
        start_time: vals.start_time ? dayjs(vals.start_time).format('YYYY-MM-DD HH:mm:ss') : null,
        reg_expiry: vals.reg_expiry ? dayjs(vals.reg_expiry).format('YYYY-MM-DD HH:mm:ss') : null,
        refund_expiry: vals.refund_expiry ? dayjs(vals.refund_expiry).format('YYYY-MM-DD HH:mm:ss') : null,
      };
      await eventApi.updateEvent(data.id, payload);
      success('修改成功');
      setEditModalVisible(false);
      if (onUpdate) {
        onUpdate({ ...data, ...payload });
      }
      onRefresh?.();
    } catch (err: any) {
      error(err.response?.data?.msg || '操作失败');
    } finally {
      setEditLoading(false);
    }
  };

  const handleMultiImageUpload = async (file: File) => {
    try {
      const res = await uploadApi.uploadImage(file) as any;
      const url = res?.url || res?.data?.url || res;
      if (url) {
        setMultiImages((prev) => [...prev, url]);
      }
    } catch {
      error('上传失败');
    }
    return false;
  };

  const handleRemoveMultiImage = (idx: number) => {
    const updated = [...multiImages];
    updated.splice(idx, 1);
    setMultiImages(updated);
    editForm.setFieldValue('arg_0', updated.join('|'));
  };

  const renderFooter = () => {
    if (!data) return null;
    const buttons: React.ReactNode[] = [];
    if (showEditButton ?? (data.status === 1 || data.status === 2)) {
      buttons.push(<Button key="edit" onClick={handleOpenEdit} style={{ marginRight: 8 }}>编辑</Button>);
    }
    if (data.status === 2 && onApprove) {
      buttons.push(<Button key="approve" type="primary" onClick={handleApprove} style={{ marginRight: 8 }}>通过审核</Button>);
    }
    if (showLockButton && (data.status === EventStatus.APPROVED || data.status === 3)) {
      buttons.push(
        <Button key="lock" danger={data.status !== 3} onClick={handleLock}>
          {data.status === EventStatus.APPROVED ? '锁定' : '解锁'}
        </Button>
      );
    }
    return buttons.length > 0 ? <div style={{ textAlign: 'left' }}>{buttons}</div> : null;
  };

  const arg1Images = data?.arg_1 ? data.arg_1.split('|').filter(Boolean) : [];
  const arg0Images = data?.arg_0 ? data.arg_0.split('|').filter(Boolean) : [];

  return (
    <>
      <Modal
        title="活动详情"
        open={open}
        onCancel={onClose}
        footer={renderFooter()}
        width={700}
        confirmLoading={loading}
      >
        {data && (
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }} styles={{ label: { whiteSpace: 'nowrap', minWidth: 100 } }}>
            <Descriptions.Item label="活动标题" span={2}>
              <Space size={1}>
                {data.category_data?.title && <Tag color="blue">{data.category_data.title}</Tag>}
                <span>{data.title || '-'}</span>
              </Space>
            </Descriptions.Item>

            {data.image && (
              <Descriptions.Item label="封面" span={2}>
                <Image src={data.image} style={{ borderRadius: 8, maxWidth: 200 }} preview={{ src: data.image }} />
              </Descriptions.Item>
            )}

            <Descriptions.Item label="发布者" span={2}>
              <Space>
                <Avatar src={data.user_data?.avatar} size="small" />
                <span>{data.user_data?.nick || data.user_data?.userid || '-'}</span>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="时间" span={2}>
              {data.start_time ? formatDateTime(data.start_time) : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="地点" span={2}>
              {data.address || '-'}
            </Descriptions.Item>

            {data.intro && (
              <Descriptions.Item label="活动内容" span={2}>
                {data.intro}
              </Descriptions.Item>
            )}

            {arg0Images.length > 0 && (
              <Descriptions.Item label="详情图片" span={2}>
                <Space wrap>
                  {arg0Images.map((img: string, idx: number) => (
                    <Image
                      key={idx}
                      src={img}
                      width={80}
                      height={80}
                      style={{ borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                      preview={{ src: img }}
                    />
                  ))}
                </Space>
              </Descriptions.Item>
            )}

            {arg1Images.length > 0 && (
              <Descriptions.Item label="活动图片" span={2}>
                <Space wrap>
                  {arg1Images.map((img: string, idx: number) => (
                    <Image
                      key={idx}
                      src={img}
                      width={80}
                      height={80}
                      style={{ borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                      preview={{ src: img }}
                    />
                  ))}
                </Space>
              </Descriptions.Item>
            )}

            <Descriptions.Item label="费用">
              {data.fee_type === 0 ? '免费' : data.fee_type === 1 ? 'AA制' : data.fee_amount ? `¥${(data.fee_amount / 100).toFixed(2)}` : '-'}
              {data.fee_type !== 2 && data.fee_amount > 0 && `（鸽子费¥${(data.fee_amount / 100).toFixed(2)}）`}
            </Descriptions.Item>

            <Descriptions.Item label="人数限制">
              {data.participants || '-'}
              {data.participants_gender && `（男${data.participants_male || 0}人，女${data.participants_female || 0}人）`}
            </Descriptions.Item>

            <Descriptions.Item label="报名截止">
              {data.reg_expiry ? formatDateTime(data.reg_expiry) : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="已报名人数">
              {data.current_participants || 0}
            </Descriptions.Item>

            <Descriptions.Item label="发布时间" styles={{ label: { whiteSpace: 'nowrap' } }} style={{ whiteSpace: 'nowrap' }}>
              {data.insertat ? formatDateTime(data.insertat) : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="取消/退费截止" styles={{ label: { whiteSpace: 'nowrap' } }} style={{ whiteSpace: 'nowrap' }}>
              {data.refund_expiry ? formatDateTime(data.refund_expiry) : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="活动状态" span={2}>
              <Tag color={STATUS_MAP[data.status]?.color || 'default'}>
                {STATUS_MAP[data.status]?.text || '其他'}
              </Tag>
            </Descriptions.Item>

            {(data.status === 2 || data.status === 3 || data.status === 4) && data.status_reason && (
              <Descriptions.Item label={data.status === 2 ? '未通过原因' : data.status === 4 ? '取消原因' : '锁定原因'} span={2}>
                {data.status_reason}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="编辑活动"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleEditSubmit}
        confirmLoading={editLoading}
        okText="提交"
        cancelText="取消"
        width={600}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="请输入标题" />
          </Form.Item>
          <Form.Item label="封面" name="image">
            <ImageUpload />
          </Form.Item>
          <Form.Item label="活动介绍" name="intro">
            <Input.TextArea rows={3} placeholder="请输入活动介绍" />
          </Form.Item>
          <Form.Item label="活动图片" extra="支持拖拽排序，上传后自动追加">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Upload
                accept="image/*"
                multiple
                showUploadList={false}
                beforeUpload={handleMultiImageUpload}
              >
                <Button icon={<PlusOutlined />}>上传图片</Button>
              </Upload>
              {multiImages.length > 0 ? (
                <Space wrap>
                  {multiImages.map((img: string, idx: number) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setOverIndex(idx);
                      }}
                      onDragEnd={() => {
                        if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
                          const reordered = [...multiImages];
                          const [removed] = reordered.splice(dragIndex, 1);
                          reordered.splice(overIndex, 0, removed);
                          setMultiImages(reordered);
                          editForm.setFieldValue('arg_0', reordered.join('|'));
                        }
                        setDragIndex(null);
                        setOverIndex(null);
                      }}
                      style={{
                        position: 'relative',
                        cursor: 'grab',
                        opacity: dragIndex === idx ? 0.5 : 1,
                        border: overIndex === idx ? '2px dashed #1890ff' : '2px solid transparent',
                        borderRadius: 6,
                      }}
                    >
                      <Image src={img} width={60} height={60} style={{ borderRadius: 4, display: 'block' }} />
                      <span
                        title="删除"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMultiImage(idx);
                        }}
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: '1px solid #ff4d4f',
                          background: '#fff',
                          color: '#ff4d4f',
                          fontSize: 12,
                          lineHeight: '16px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        ❌
                      </span>
                    </div>
                  ))}
                </Space>
              ) : null}
            </Space>
          </Form.Item>
          <Form.Item label="活动时间" name="start_time">
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder="请选择活动时间" />
          </Form.Item>
          <Form.Item label="报名截止时间" name="reg_expiry">
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder="请选择报名截止时间" />
          </Form.Item>
          <Form.Item label="取消/退费截止时间" name="refund_expiry">
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" placeholder="请选择取消/退费截止时间" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default EventDetailModal;
