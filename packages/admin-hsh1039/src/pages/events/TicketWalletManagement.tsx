import TicketListPage from '@/components/events/TicketListPage';

const TICKET_WALLET_CONFIG = {
  title: '票夹管理',
  description: '管理门票票夹，查看持有人、核销状态、转赠记录及退款情况。',
  defaultRootCategoryId: 2,
};

const TicketWalletManagement = () => {
  return <TicketListPage config={TICKET_WALLET_CONFIG} />;
};

export default TicketWalletManagement;
