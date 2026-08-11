import React, { useState, useCallback, useEffect } from 'react';
import { useAppNotification } from '@/hooks/useAppNotification';
import { Card, Form, Button, Input, Typography, Spin, DatePicker } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { settingsApi, SettingType } from '@/api/services/settings';
import ImageUpload from '@/components/common/ImageUpload';
import { safeDayjs, dayjsToApi } from '@/utils/format';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface HomePopupData {
  image: string;
  link: string;
  start_time: string;
  end_time: string;
}

const EMPTY_DATA: HomePopupData = { image: '', link: '', start_time: '', end_time: '' };

const HomePopupManagement: React.FC = () => {
  const { success, error: showError } = useAppNotification();
  const [data, setData] = useState<HomePopupData>(EMPTY_DATA);
  const [timeRange, setTimeRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingId, setSettingId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await settingsApi.getSettings({ keyword: 'home_popup', size: 100 });
      const list = res?.list || [];
      const item = list.find((s: any) => s.key === 'home_popup');
      if (item) {
        setSettingId(item.id);
        try {
          const parsed = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
          const d: HomePopupData = {
            image: parsed.image || '',
            link: parsed.link || '',
            start_time: parsed.start_time || '',
            end_time: parsed.end_time || '',
          };
          setData(d);
          if (d.start_time && d.end_time) {
            const s = safeDayjs(d.start_time);
            const e = safeDayjs(d.end_time);
            if (s && e) setTimeRange([s, e]);
          }
        } catch {
          setData(EMPTY_DATA);
        }
      } else {
        setSettingId('');
        setData(EMPTY_DATA);
      }
    } catch {
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const value = JSON.stringify(data);
    setSaving(true);
    try {
      if (settingId) {
        await settingsApi.updateSetting(settingId, { value });
      } else {
        const createRes: any = await settingsApi.createSetting({
          key: 'home_popup',
          type: SettingType.JSON,
          value,
          group_name: 'popup',
        });
        if (createRes?.id) setSettingId(createRes.id);
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
      <Typography.Title level={2}>首页弹窗管理</Typography.Title>
      <p style={{ color: '#666', marginBottom: 24 }}>配置 App 首页启动弹窗的图片、跳转链接和有效时段。</p>
      <Card style={{ maxWidth: 800 }}>
        <Spin spinning={loading}>
          <Form layout="vertical">
            <Form.Item label="弹窗图片" extra="建议尺寸：750 × 1000 像素">
              <ImageUpload
                value={data.image}
                onChange={url => setData(prev => ({ ...prev, image: url }))}
              />
            </Form.Item>

            <Form.Item label="跳转链接">
              <Input
                value={data.link}
                onChange={e => setData(prev => ({ ...prev, link: e.target.value }))}
                placeholder="请输入点击弹窗后的跳转链接（选填）"
              />
            </Form.Item>

            <Form.Item label="有效时段">
              <RangePicker
                showTime
                format="YYYY/MM/DD HH:mm"
                style={{ width: '100%' }}
                value={timeRange}
                onChange={(dates) => {
                  setTimeRange(dates as [Dayjs, Dayjs] | null);
                  if (dates?.[0] && dates?.[1]) {
                    setData(prev => ({
                      ...prev,
                      start_time: dayjsToApi(dates[0])!,
                      end_time: dayjsToApi(dates[1])!,
                    }));
                  } else {
                    setData(prev => ({ ...prev, start_time: '', end_time: '' }));
                  }
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24 }}>
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Spin>
      </Card>
    </div>
  );
};

export default HomePopupManagement;
