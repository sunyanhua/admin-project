import { useState, useEffect } from 'react';
import { Button, Space, Select, Modal, Image, Divider, Row, Col, App } from 'antd';
import { QrcodeOutlined, CopyOutlined } from '@ant-design/icons';
import { statisticsApi } from '@/api/services/statistics';
import { sourceApi } from '@/api/services/source';

const APPID = 'wxb0f15549e07308d5';

export interface SourceQrcodeModalProps {
  basePage: string;
  children?: React.ReactNode;
}

const SourceQrcodeModal: React.FC<SourceQrcodeModalProps> = ({ basePage, children }) => {
  const { message } = App.useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [pagePath, setPagePath] = useState('');
  const [qrcodeUrl, setQrcodeUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (modalVisible) {
      sourceApi.getSources({ key: 'default', status: 0, length: 100 }).then((res: any) => {
        setSources(res?.data || []);
        // 打开弹窗默认选中"无来源"并立即调用接口
        handleSourceChange('');
      }).catch(console.error);
    }
  }, [modalVisible]);

  const handleSourceChange = async (sourceId: string) => {
    setSelectedSource(sourceId);
    setPagePath('');
    setQrcodeUrl('');
    setQrLoading(true);
    try {
      // 判断页面路径是否已有查询参数，决定source参数的连接方式
      const hasQuery = basePage.includes('?');
      const separator = hasQuery ? '&' : '?';

      const sceneRes: any = await statisticsApi.getScene({
        appid: APPID,
        data: sourceId === '' ? basePage : `${basePage}${separator}source=${sourceId}`,
      });
      const sceneStr = sceneRes?.id || '';
      // 无论有无来源，都生成 /pages/source/index?id={sceneStr} 路径
      const path = `/pages/source/index?id=${sceneStr}`;
      setPagePath(path);

      // 提取page路径（不含query参数）用于qrcode接口
      const pagePathOnly = basePage.split('?')[0];

      const qrRes: any = await statisticsApi.getQrcode({
        appid: APPID,
        page: sourceId === '' ? pagePathOnly : 'pages/source/index',
        scene: sourceId === '' ? basePage : `${basePage}${separator}source=${sourceId}`,
        width: 640,
        check_path: false,
      });
      setQrcodeUrl(qrRes || '');
    } catch (err) {
      console.error(err);
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <>
      {children ? (
        <span onClick={() => setModalVisible(true)}>{children}</span>
      ) : (
        <Button type="default" size="small" icon={<QrcodeOutlined />} onClick={() => setModalVisible(true)} style={{ borderRadius: 4, color: '#1890ff', borderColor: '#1890ff', padding: '0 4px', marginLeft: 6 }} />
      )}

      <Modal
        title="获取页面地址和小程序码"
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setSelectedSource(''); setPagePath(''); setQrcodeUrl(''); }}
        footer={null}
        width={600}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Space size={24} split={<Divider type="vertical" />}>
              <span>原始ID：gh_1a79e8bbfa0f <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText('gh_1a79e8bbfa0f'); message.success('复制成功'); }} /></span>
              <span>微信ID：wxb0f15549e07308d5 <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText('wxb0f15549e07308d5'); message.success('复制成功'); }} /></span>
            </Space>
          </div>
          <Divider style={{ margin: '16px 0' }} />
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>来源渠道：</label>
            <Select
              placeholder="请选择来源渠道"
              style={{ width: '100%' }}
              value={selectedSource}
              onChange={handleSourceChange}
            >
              <Select.Option value="">无来源</Select.Option>
              {sources.map((s: any) => (
                <Select.Option key={s.id} value={String(s.id)}>{s.title}</Select.Option>
              ))}
            </Select>
          </div>
          {pagePath && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>页面路径：</label>
              <Space size={4}>
                <span>{pagePath}</span>
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(pagePath); message.success('复制成功'); }} />
              </Space>
            </div>
          )}
          {qrcodeUrl && (
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, textAlign: 'left' }}>小程序码：</label>
              <div style={{ textAlign: 'center' }}>
                <Image src={qrcodeUrl} alt="小程序码" style={{ width: 320, height: 320 }} />
              </div>
            </div>
          )}
          {qrLoading && <div style={{ textAlign: 'center', padding: 40 }}>生成中...</div>}
        </div>
      </Modal>
    </>
  );
};

export default SourceQrcodeModal;
