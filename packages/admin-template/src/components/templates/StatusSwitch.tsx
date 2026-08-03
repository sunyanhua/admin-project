import { Switch, } from 'antd';
import { useAppNotification } from '@/hooks/useAppNotification';

export interface StatusSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => Promise<void>;
  checkedChildren?: string;
  unCheckedChildren?: string;
  disabled?: boolean;
}

export const StatusSwitch: React.FC<StatusSwitchProps> = ({
  checked,
  onChange,
  checkedChildren = '启用',
  unCheckedChildren = '禁用',
  disabled = false,
}) => {
  const { error: showError } = useAppNotification();

  const handleChange = async (newChecked: boolean) => {
    try {
      await onChange(newChecked);
    } catch (err: any) {
      showError(err?.response?.data?.msg || err?.message || '状态更新失败');
    }
  };

  return (
    <Switch
      checked={checked}
      onChange={handleChange}
      checkedChildren={checkedChildren}
      unCheckedChildren={unCheckedChildren}
      disabled={disabled}
    />
  );
};
