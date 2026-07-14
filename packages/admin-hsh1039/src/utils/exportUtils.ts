import * as XLSX from 'xlsx';
import { globalMessage as message } from '@/utils/message';
import { UserStatus } from '@shared/constants/user.enums';
import { ActivityCategory, ActivityStatus, FeeMode } from '@shared/constants/activity.enums';

/**
 * 导出数据到Excel文件
 * @param data 要导出的数据数组
 * @param columns 列配置数组，包含title(列标题)、dataIndex(数据字段)、render(可选渲染函数)
 * @param fileName 导出文件名（不含扩展名）
 */
export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  columns: Array<{
    title: string;
    dataIndex: string;
    render?: (value: any, record: T, index: number) => any;
  }>,
  fileName: string
) => {
  try {
    if (!data || data.length === 0) {
      message.warning('没有数据可以导出');
      return;
    }

    // 处理数据：根据列配置转换每条记录
    const rows = data.map((record, rowIndex) => {
      const row: Record<string, any> = {};
      columns.forEach((column) => {
        const { dataIndex, render } = column;
        const value = record[dataIndex];
        // 如果有render函数，使用render处理值；否则使用原始值
        row[column.title] = render ? render(value, record, rowIndex) : value;
      });
      return row;
    });

    // 创建工作簿和工作表
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // 设置列宽（可选）
    const colWidths = columns.map(col => ({
      wch: Math.max(col.title.length, 15) // 至少15字符宽
    }));
    worksheet['!cols'] = colWidths;

    // 生成Excel文件并下载
    XLSX.writeFile(workbook, `${fileName}_${new Date().getTime()}.xlsx`);
    message.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败，请重试');
  }
};

/**
 * 导出用户数据到Excel
 * @param users 用户数据数组
 */
export const exportUsersToExcel = (users: any[]) => {
  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '手机号', dataIndex: 'phone' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: number) => {
        // 使用用户状态枚举映射
        const statusMap: Record<number, string> = {
          [UserStatus.NORMAL]: '正常',
          [UserStatus.BANNED]: '封禁',
          [UserStatus.DELETED]: '已删除'
        };
        return statusMap[status] || '未知';
      }
    },
    { title: '注册时间', dataIndex: 'createdAt' },
  ];

  exportToExcel(users, columns, '用户列表');
};

/**
 * 导出活动数据到Excel
 * @param activities 活动数据数组
 */
export const exportActivitiesToExcel = (activities: any[]) => {
  const columns = [
    { title: '活动标题', dataIndex: 'title' },
    { title: '组织者', dataIndex: 'organizer' },
    {
      title: '活动分类',
      dataIndex: 'category',
      render: (category: number) => {
        const categoryMap: Record<number, string> = {
          [ActivityCategory.MEAL]: '吃饭',
          [ActivityCategory.CYCLING]: '骑行',
          [ActivityCategory.HIKING]: '徒步',
          [ActivityCategory.SPORTS]: '运动',
          [ActivityCategory.ENTERTAINMENT]: '娱乐',
          [ActivityCategory.LEARNING]: '学习',
          [ActivityCategory.OTHER]: '其他',
        };
        return categoryMap[category] || '未知';
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (status: number) => {
        const statusMap: Record<number, string> = {
          [ActivityStatus.DRAFT]: '草稿',
          [ActivityStatus.PENDING_REVIEW]: '待审核',
          [ActivityStatus.APPROVED]: '已通过',
          [ActivityStatus.REJECTED]: '已拒绝',
          [ActivityStatus.PUBLISHED]: '已发布',
          [ActivityStatus.CANCELED]: '已取消',
          [ActivityStatus.COMPLETED]: '已完成',
        };
        return statusMap[status] || '未知';
      }
    },
    { title: '参与人数', dataIndex: 'participants' },
    { title: '最大人数', dataIndex: 'maxParticipants' },
    { title: '创建时间', dataIndex: 'createdAt' },
    { title: '活动时间', dataIndex: 'activityTime' },
    { title: '地点', dataIndex: 'location' },
    {
      title: '费用模式',
      dataIndex: 'feeMode',
      render: (feeMode: number) => {
        const feeModeMap: Record<number, string> = {
          [FeeMode.FREE]: '免费',
          [FeeMode.AA]: 'AA制',
          [FeeMode.HOST_PAYS]: '主办方支付',
        };
        return feeModeMap[feeMode] || '未知';
      }
    },
  ];

  exportToExcel(activities, columns, '活动列表');
};