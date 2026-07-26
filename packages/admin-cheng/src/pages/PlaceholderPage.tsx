import { Typography, Card, Result } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div>
      <Title level={2}>{title}</Title>
      <p style={{ color: '#666', marginBottom: 24 }}>该功能模块正在开发中，敬请期待。</p>
      <Card>
        <Result
          icon={<ToolOutlined />}
          title="功能开发中"
          subTitle="当前页面暂无数据，请联系管理员或等待后续更新。"
        />
      </Card>
    </div>
  );
};

export default PlaceholderPage;
