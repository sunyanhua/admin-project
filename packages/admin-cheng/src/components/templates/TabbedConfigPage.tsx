import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Card, Tabs, Form, Button, Typography, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { configApi } from '@/api/services/config';
import { RichTextEditor } from './RichTextEditor';

export interface TabConfig {
  key: string;
  label: string;
  configName: string;
  content?: string;
}

export interface TabbedConfigPageProps {
  title: string;
  description?: string;
  tabs: TabConfig[];
  onSave?: (key: string, content: string) => Promise<void>;
  renderExtra?: (key: string) => React.ReactNode;
}

export const TabbedConfigPage: React.FC<TabbedConfigPageProps> = ({
  title,
  description,
  tabs,
  onSave,
  renderExtra,
}) => {
  const safeTabs = tabs || [];
  const [activeTab, setActiveTab] = useState(safeTabs[0]?.key || '');
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const isFirstRender = useRef(true);
  const { success, error } = useAppNotification();

  const fetchContent = useCallback(async (tab: TabConfig) => {
    if (!tab?.key) return;
    setLoading(prev => ({ ...prev, [tab.key]: true }));
    try {
      const res = await configApi.getConfig(tab.configName) as any;
      let data: any = {};
      if (res?.data) {
        try {
          data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        } catch {
          data = { content: res.data };
        }
      }
      setContents(prev => ({ ...prev, [tab.key]: data.content || '' }));
    } catch {
      setContents(prev => ({ ...prev, [tab.key]: '' }));
    } finally {
      setLoading(prev => ({ ...prev, [tab.key]: false }));
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current && safeTabs.length > 0) {
      isFirstRender.current = false;
      fetchContent(safeTabs[0]);
    }
  }, [fetchContent, safeTabs]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (!contents[key]) {
      const tab = safeTabs.find(t => t.key === key);
      if (tab) fetchContent(tab);
    }
  };

  const handleEditorChange = (value: string) => {
    setContents(prev => ({ ...prev, [activeTab]: value }));
  };

  const handleSave = async () => {
    const content = contents[activeTab];
    const tab = tabs.find(t => t.key === activeTab);
    if (!tab) return;

    setSaving(true);
    try {
      if (onSave) {
        await onSave(activeTab, content);
      } else {
        const payload = {
          name: tab.configName,
          mime: 'application/json',
          data: JSON.stringify({ content }),
        };
        await configApi.setConfig(tab.configName, payload);
      }
      success('保存成功');
    } catch (err: any) {
      error(err.response?.data?.msg || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const currentTab = tabs.find(t => t.key === activeTab);
  const extraContent = currentTab ? renderExtra?.(currentTab.key) : null;

  const tabItems = tabs.map(tab => ({
    key: tab.key,
    label: tab.label,
    children: (
      <Form layout="vertical">
        <RichTextEditor
          value={contents[tab.key] || ''}
          onChange={handleEditorChange}
          disabled={loading[tab.key]}
        />
        {extraContent}
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
    ),
  }));

  return (
    <div>
      <Typography.Title level={2}>{title}</Typography.Title>
      {description && (
        <p style={{ color: '#666', marginBottom: 24 }}>{description}</p>
      )}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
        />
      </Card>
    </div>
  );
};
