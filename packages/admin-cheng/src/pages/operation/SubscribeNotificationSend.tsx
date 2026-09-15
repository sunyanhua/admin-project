import { useState, useEffect, useCallback } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Space, Statistic } from 'antd';
import { ReloadOutlined, SendOutlined, BellOutlined, MoreOutlined, LinkOutlined, RightOutlined } from '@ant-design/icons';
import { useAppNotification } from '@/hooks/useAppNotification';
import { notificationApi, SubscribeBindSummary } from '@/api/services/notification';
import { StandardPage } from '@/components/templates/StandardPage';
import logoNotification from '@/styles/logo-notification.png';

const SubscribeNotificationSend: React.FC = () => {
  const { success, error: showError } = useAppNotification();
  const [form] = Form.useForm();
  const [summary, setSummary] = useState<SubscribeBindSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // 消息预览实时联动表单输入
  const previewProject = Form.useWatch('content_thing5', form);
  const previewCode = Form.useWatch('content_character', form);

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

          {/* 发送表单 + 消息预览 */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Card title="发送通知" size="small" style={{ flex: '1 1 380px', maxWidth: 560 }}>
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
                  rules={[{ required: true, message: '请输入报名编号' }, { max: 32, message: '最多32个字' }]}
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

            {/* 微信消息卡片预览 */}
            <div style={{ flex: '1 1 360px', maxWidth: 480, minWidth: 340 }}>
              <Card title="消息预览" size="small">
                <div style={{ padding: '2px 0' }}>
                  <div style={{ border: '1px solid #e5e5e5', borderRadius: 10, background: '#fff', padding: '20px 22px', maxWidth: 420, margin: '0 auto' }}>
                    {/* 第一行：标题 + 铃铛/三点 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 17, fontWeight: 600, color: 'rgba(0,0,0,.88)' }}>收到用户报名提交通知</span>
                      <Space size={12}>
                        <BellOutlined style={{ color: 'rgba(0,0,0,.45)', fontSize: 17 }} />
                        <MoreOutlined style={{ color: 'rgba(0,0,0,.45)', fontSize: 17 }} />
                      </Space>
                    </div>
                    {/* 第二行：报名项目 */}
                    <div style={{ fontSize: 16, lineHeight: '26px' }}>
                      <span style={{ color: 'rgba(0,0,0,.45)' }}>报名项目：</span>
                      <span style={{ color: 'rgba(0,0,0,.88)' }}>{previewProject || <span style={{ color: 'rgba(0,0,0,.25)' }}>待填写</span>}</span>
                    </div>
                    {/* 第三行：报名编号 */}
                    <div style={{ fontSize: 16, lineHeight: '26px' }}>
                      <span style={{ color: 'rgba(0,0,0,.45)' }}>报名编号：</span>
                      <span style={{ color: 'rgba(0,0,0,.88)' }}>{previewCode || <span style={{ color: 'rgba(0,0,0,.25)' }}>待填写</span>}</span>
                    </div>
                    {/* 分割线 */}
                    <div style={{ height: 1, background: '#f0f0f0', margin: '14px 0' }} />
                    {/* 第四行：小程序来源 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Space size={8}>
                        <img src={logoNotification} alt="他俩能成" style={{ width: 16, height: 'auto' }} />
                        <span style={{ fontSize: 15, color: 'rgba(0,0,0,.65)' }}>他俩能成</span>
                      </Space>
                      <Space size={4}>
                        <LinkOutlined style={{ color: '#6355c7', fontSize: 15 }} />
                        <span style={{ fontSize: 15, color: 'rgba(0,0,0,.45)' }}>小程序</span>
                        <RightOutlined style={{ color: 'rgba(0,0,0,.45)', fontSize: 14 }} />
                      </Space>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default SubscribeNotificationSend;
