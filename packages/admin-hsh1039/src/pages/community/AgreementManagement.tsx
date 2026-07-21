import { useState, useCallback, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Card, Tabs, Form, Button, Input, Typography, Space, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { settingsApi } from '@/api/services/settings';
import { RichTextEditor } from '@/components/templates/RichTextEditor';

interface AgreementTab {
  key: string;
  label: string;
  configKey: string;
  title: string;
}

const AGREEMENT_TABS: AgreementTab[] = [
  { key: 'user', label: '用户协议', configKey: 'agreement_user', title: '用户协议' },
  { key: 'privacy', label: '隐私条款', configKey: 'agreement_privacy', title: '隐私条款' },
];

const AgreementManagement = () => {
  const { success, error: showError } = useAppNotification();
  const [activeTab, setActiveTab] = useState(AGREEMENT_TABS[0].key);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [styles, setStyles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingIds, setSettingIds] = useState<Record<string, number>>({});

  const currentTab = AGREEMENT_TABS.find((t) => t.key === activeTab)!;

  const fetchContent = useCallback(async (tab: AgreementTab) => {
    setLoading(true);
    try {
      const res: any = await settingsApi.getSettings({ keyword: tab.configKey, page_size: 100 });
      const list = res?.list || [];
      const item = list.find((s: any) => s.key === tab.configKey);
      if (item) {
        setSettingIds((prev) => ({ ...prev, [tab.key]: item.id }));
        try {
          const parsed = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
          setContents((prev) => ({ ...prev, [tab.key]: parsed.content || '' }));
          setStyles((prev) => ({ ...prev, [tab.key]: parsed.style || 'padding:15px;' }));
        } catch {
          setContents((prev) => ({ ...prev, [tab.key]: item.value || '' }));
          setStyles((prev) => ({ ...prev, [tab.key]: 'padding:15px;' }));
        }
      } else {
        setSettingIds((prev) => ({ ...prev, [tab.key]: 0 }));
        setContents((prev) => ({ ...prev, [tab.key]: '' }));
        setStyles((prev) => ({ ...prev, [tab.key]: 'padding:15px;' }));
      }
    } catch {
      setContents((prev) => ({ ...prev, [tab.key]: '' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent(currentTab);
  }, [activeTab, fetchContent]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleEditorChange = (value: string) => {
    setContents((prev) => ({ ...prev, [activeTab]: value }));
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStyles((prev) => ({ ...prev, [activeTab]: e.target.value }));
  };

  const handleSave = async () => {
    const tab = AGREEMENT_TABS.find((t) => t.key === activeTab);
    if (!tab) return;

    const value = JSON.stringify({
      title: tab.title,
      style: styles[activeTab] || 'padding:15px;',
      content: contents[activeTab] || '',
    });

    setSaving(true);
    try {
      const id = settingIds[activeTab];
      if (id) {
        await settingsApi.updateSetting(id, { value });
      } else {
        // 不存在则先创建
        const createRes: any = await settingsApi.createSetting({
          key: tab.configKey,
          type: 'string',
          value,
        });
        if (createRes?.id) {
          setSettingIds((prev) => ({ ...prev, [activeTab]: createRes.id }));
        }
      }
      success('保存成功');
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Typography.Title level={2}>协议文档管理</Typography.Title>
      <p style={{ color: '#666', marginBottom: 24 }}>管理平台的用户协议和隐私条款。</p>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={AGREEMENT_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children: (
              <Spin spinning={loading}>
                <Form layout="vertical">
                  <div style={{ display: 'none' }}>
                    <Form.Item label="样式">
                      <Input value={styles[activeTab] || 'padding:15px;'} onChange={handleStyleChange} />
                    </Form.Item>
                  </div>
                  <RichTextEditor
                    value={contents[tab.key] || ''}
                    onChange={handleEditorChange}
                    disabled={false}
                  />
                  <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                    <Space>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleSave}
                      >
                        保存
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Spin>
            ),
          }))}
        />
      </Card>
    </div>
  );
};

export default AgreementManagement;
