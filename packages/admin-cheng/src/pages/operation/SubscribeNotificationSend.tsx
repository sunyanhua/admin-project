import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Space, Statistic } from 'antd';
import { ReloadOutlined, SendOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { notificationApi, SubscribeBindSummary } from '@/api/services/notification';
import { StandardPage } from '@/components/templates/StandardPage';

const SubscribeNotificationSend: React.FC = () => {
  const { success, error: showError } = useAppNotification();
  const [form] = Form.useForm();
  const [summary, setSummary] = useState<SubscribeBindSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res: any = await notificationApi.getSubscribeBindSummary();
      setSummary(res as SubscribeBindSummary);
    } catch (err: any) {
      showError(err?.response?.data?.message || '获取订阅情况失败');
    } finally {
      setSummaryLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      setSending(true);
      const res: any = await notificationApi.broadcastServiceTemplate({
        content_thing5: values.content_thing5,
        content_character: values.content_character,
        page_path: values.page_path || undefined,
      });
      success(`发送任务已创建（批次 ${res?.id ?? ''}），将由系统异步发送`);
      form.resetFields();
    } catch (err: any) {
      if (err?.errorFields) return;
      showError(err?.response?.data?.message || '发送失败');
    } finally {
      setSending(false);
    }
  };

  /** 发送前校验并确认（向全体已绑定用户广播，二次确认） */
  const confirmSend = async () => {
    try {
      await form.validateFields();
    } catch { return; } // 校验不通过不弹确认
    Modal.confirm({
      title: '确认发送',
      content: '将向所有已绑定服务号的用户发送该通知，确认发送？',
      okText: '发送',
      cancelText: '取消',
      onOk: handleSend,
    });
  };

  return (
    <StandardPage
      title="订阅通知发送"
      description="向已关注服务号的用户发送通知消息，可查看当前关注绑定情况。"
      extraActions={
        <Button icon={<ReloadOutlined />} loading={summaryLoading} onClick={fetchSummary}>刷新</Button>
      }
      table={
        <div>
          {/* 当前订阅情况 */}
          <Card title="当前订阅情况" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="已绑定（当前订阅人数）" value={summary?.bound_count ?? '-'} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="待扫码"
                  value={summary?.pending_count ?? '-'}
                  suffix={summary && summary.expired_pending_count > 0 ? `（其中已过期 ${summary.expired_pending_count}）` : ''}
                />
              </Col>
              <Col span={6}>
                <Statistic title="已解绑" value={summary?.unbound_count ?? '-'} />
              </Col>
              <Col span={6}>
                <Statistic title="总记录" value={summary?.total_count ?? '-'} />
              </Col>
            </Row>
          </Card>

          {/* 发送表单 */}
          <Card title="发送通知" size="small" style={{ maxWidth: 640 }}>
            <Form form={form} layout="vertical" autoComplete="off">
              <Form.Item
                label="报名项目"
                name="content_thing5"
                rules={[{ required: true, message: '请输入报名项目' }, { max: 20, message: '最多20个字' }]}
              >
                <Input placeholder="请输入报名项目，如：9月交友派对" maxLength={20} showCount />
              </Form.Item>
              <Form.Item
                label="报名编号"
                name="content_character"
                rules={[{ required: true, message: '请输入报名编号' }, { max:32, message: '最多32个字' }]}
              >
                <Input placeholder="请输入报名编号" maxLength={32} showCount />
              </Form.Item>
              <Form.Item
                label="跳转页面"
                name="page_path"
                rules={[{ max: 128, message: '最多128个字符' }]}
                extra="选填：用户点击通知后跳转的小程序页面路径"
              >
                <Input placeholder="如：pages/activity-detail/index?id=xxx" maxLength={128} />
              </Form.Item>
              <Space>
                <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={confirmSend}>发送</Button>
              </Space>
            </Form>
          </Card>
        </div>
      }
    />
  );
};

export default SubscribeNotificationSend;
