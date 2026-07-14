import { TabbedConfigPage } from '@/components/templates/TabbedConfigPage';

const AgreementManagement = () => {
  const tabs = [
    { key: 'user', label: '用户协议', configName: 'agreement_user' },
    { key: 'privacy', label: '隐私政策', configName: 'agreement_privacy' },
    { key: 'safety_organizer', label: '安全提醒（主办方）', configName: 'agreement_safety_organizer' },
    { key: 'safety_participant', label: '安全提醒（报名者）', configName: 'agreement_safety_participant' },
    { key: 'cooperator', label: '主理人认证协议', configName: 'agreement_cooperator' },
    { key: 'merchant', label: '商户认证协议', configName: 'agreement_merchant' },
  ];

  return (
    <TabbedConfigPage
      title="协议文档管理"
      description="管理平台的用户协议、隐私政策等文档内容。"
      tabs={tabs}
    />
  );
};

export default AgreementManagement;
