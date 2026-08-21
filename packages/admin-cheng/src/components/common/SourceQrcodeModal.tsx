import { useState, useEffect } from 'react';
import { Button, Space, Select, Modal, Image, Divider, Spin } from 'antd';
import { QrcodeOutlined, CopyOutlined } from '@ant-design/icons';
import { wxaApi } from '@/api/services/wxa';
import { sourceApi } from '@/api/services/source';
import { useAppNotification } from '@/hooks/useAppNotification';

// 本小程序微信 ID / 原始 ID
const APPID = 'wx8aed7b2d08302c3b';
const ORIGINAL_ID = 'gh_6cea97604e22';

// 统一解析页路径（小程序端扫码后由该页还原 scene）
const RESOLVE_PAGE = 'pages/source/index';

export interface SourceQrcodeModalProps {
  /** 目标页面路径（如 pages/activity/detail?id=xxx） */
  basePage: string;
  children?: React.ReactNode;
}

const SourceQrcodeModal: React.FC<SourceQrcodeModalProps> = ({ basePage, children }) => {
  const { success, error: showError } = useAppNotification();
  const [modalVisible, setModalVisible] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [pagePath, setPagePath] = useState('');
  const [qrcodeUrl, setQrcodeUrl] = useState('');
  const [shortLink, setShortLink] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    if (!modalVisible) return;
    sourceApi.getSources({ page: 1, size: 100, status: 0 })
      .then((res: any) => {
        const list = Array.isArray(res) ? res : (res?.list || []);
        setSources(list);
      })
      .catch(() => setSources([]))
      .finally(() => {
        // 打开弹窗默认选中"无来源"并立即生成
        handleSourceChange('');
      });
  }, [modalVisible]);

  const handleSourceChange = async (sourceId: string) => {
    setSelectedSource(sourceId);
    setPagePath('');
    setQrcodeUrl('');
    setShortLink('');
    setQrLoading(true);
    try {
      // scene 参数：JSON 字符串（url 必带，source 选填）
      const sceneData: { url: string; source?: string } = { url: basePage };
      if (sourceId !== '') sceneData.source = sourceId;

      // 1. 直接生成小程序码：scene 传 JSON 字符串 + encode=true 转码（不再单独调用 scenes 接口）
      const qrRes: any = await wxaApi.createQrcode({
        appid: APPID,
        page: RESOLVE_PAGE,
        scene: JSON.stringify(sceneData),
        encode: true,
        width: 640,
        check_path: false,
      });
      const sceneRef = qrRes?.scene || '';
      if (!sceneRef) throw new Error('小程序码生成失败');
      setQrcodeUrl(qrRes?.image_url || '');

      // 2. 展示统一解析页路径
      const path = `/${RESOLVE_PAGE}?scene=${sceneRef}`;
      setPagePath(path);

      // 3. 短链（page_url 格式：/pages/source/index?scene={scene}）
      const linkRes: any = await wxaApi.createShortlink({
        appid: APPID,
        page_url: `/${RESOLVE_PAGE}?scene=${sceneRef}`,
        is_permanent: false,
      });
      setShortLink(linkRes?.link || '');
    } catch (err: any) {
      showError(err?.response?.data?.message || '生成失败');
    } finally {
      setQrLoading(false);
    }
  };

  return (
    <>
      {children ? (
        <span onClick={() => setModalVisible(true)}>{children}</span>
      ) : (
        <Button type="default" size="small" icon={<QrcodeOutlined />} onClick={() => setModalVisible(true)}
          style={{ borderRadius: 4, color: '#1890ff', borderColor: '#1890ff', padding: '0 4px', marginLeft: 6 }} />
      )}

      <Modal
        title="获取页面地址和小程序码"
        open={modalVisible}
        onCancel={() => { setModalVisible(false); setSelectedSource(''); setPagePath(''); setQrcodeUrl(''); setShortLink(''); }}
        footer={null}
        width={600}
        maskClosable={false}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Space size={24} split={<Divider type="vertical" />}>
              <span>原始ID：{ORIGINAL_ID} <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(ORIGINAL_ID); success('复制成功'); }} /></span>
              <span>微信ID：{APPID} <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(APPID); success('复制成功'); }} /></span>
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
                <Select.Option key={s.id} value={String(s.id)}>{s.name}</Select.Option>
              ))}
            </Select>
          </div>
          {pagePath && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>页面路径：</label>
              <Space size={4}>
                <span>{pagePath}</span>
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(pagePath); success('复制成功'); }} />
              </Space>
            </div>
          )}
          {shortLink && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>小程序短链接（30天内有效）：</label>
              <Space size={4}>
                <span style={{ color: '#1890ff' }}>{shortLink}</span>
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(shortLink); success('复制成功'); }} />
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
          {qrLoading && <div style={{ textAlign: 'center', padding: 40 }}><Spin /> 生成中...</div>}
        </div>
      </Modal>
    </>
  );
};

export default SourceQrcodeModal;
