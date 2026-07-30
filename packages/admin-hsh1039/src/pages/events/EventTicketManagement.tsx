import TicketListPage from '@/components/events/TicketListPage';

const EVENT_TICKET_CONFIG = {
  title: '入场券管理',
  description: '管理活动入场券/票夹，查看持有人、核销状态、转赠记录及退款情况。',
  defaultRootCategoryId: 1,
};

const EventTicketManagement = () => {
  return <TicketListPage config={EVENT_TICKET_CONFIG} />;
};

export default EventTicketManagement;
