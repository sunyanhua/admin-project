import { useState } from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { settingsApi, SettingItem } from '@/api/services/settings';
import { useAppNotification } from '@/hooks/useAppNotification';
import { StandardPage } from '@/components/templates/StandardPage';

const { TextArea } = Input;

const PageConfigManagement = () => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const { success, error: showError, warning } = useAppNotification();

  const handleQuery = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res: any = await settingsApi.getSettings({ keyword: name.trim(), page_size: 100 });
      const list: SettingItem[] = Array.isArray(res?.list) ? res.list : (Array.isArray(res) ? res : []);
      const found = list.find((item: SettingItem) => item.key === name.trim());
      if (found) {
        setCurrentId(found.id);
        setContent(found.value || '');
        success('配置已加载');
      } else {
        setCurrentId(null);
        setContent('');
        warning('没有找到此配置，您可以填写内容后保存创建新配置');
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || '查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { warning('请输入配置名称'); return; }
    setSaving(true);
    try {
      if (currentId) {
        await settingsApi.updateSetting(currentId, { value: content });
      } else {
        await settingsApi.createSetting({
          key: name.trim(),
          type: 'text',
          value: content,
          label: name.trim(),
        });
      }
      success('保存成功');
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StandardPage
      title="页面配置管理"
      description="管理系统页面配置项，通过配置名称查询和编辑配置内容。"
      table={
        <div style={{ maxWidth: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ whiteSpace: 'nowrap', fontSize: 14 }}>配置名称：</span>
            <Input
              placeholder="请输入配置名称（key）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPressEnter={handleQuery}
              style={{ flex: 1 }}
            />
            <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={handleQuery}>
              查询
            </Button>
          </div>

          <div style={{ marginBottom: 8, fontSize: 14 }}>配置内容：</div>
          <TextArea
            rows={16}
            placeholder="点击查询后加载或输入配置内容"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div style={{ marginTop: 16 }}>
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存配置
            </Button>
          </div>
        </div>
      }
    />
  );
};

export default PageConfigManagement;
