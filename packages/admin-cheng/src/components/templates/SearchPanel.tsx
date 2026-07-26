import React from 'react';
import { Space, Select, Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export interface FilterOption {
  label: string;
  value: any;
}

export interface FilterConfig {
  name: string;
  placeholder: string;
  type: 'select' | 'input';
  options?: FilterOption[];
}

export interface SearchPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSearch: (values: Record<string, any>) => void;
  onReset: () => void;
  searchButtonText?: string;
  resetButtonText?: string;
  showSearchButton?: boolean;
  showResetButton?: boolean;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  filters,
  values,
  onChange,
  onSearch,
  onReset,
  searchButtonText = '搜索',
  resetButtonText = '重置',
  showSearchButton = true,
  showResetButton = true,
}) => {
  const handleSelectChange = (name: string, value: any) => {
    const newValues = { ...values, [name]: value };
    onChange(name, value);
    onSearch(newValues);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch(values);
    }
  };

  return (
    <Space wrap>
      {filters.map((filter) => (
        <React.Fragment key={filter.name}>
          {filter.type === 'select' ? (
            <Select
              placeholder={filter.placeholder}
              value={values[filter.name]}
              onChange={(value) => handleSelectChange(filter.name, value)}
              allowClear
              style={{ width: 120 }}
            >
              {filter.options?.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Input
              name={filter.name}
              placeholder={filter.placeholder}
              value={values[filter.name]}
              onChange={(e) => onChange(filter.name, e.target.value)}
              onKeyPress={handleKeyPress}
              allowClear
              style={{ width: 180 }}
            />
          )}
        </React.Fragment>
      ))}
      {showSearchButton && (
        <Button type="primary" icon={<SearchOutlined />} onClick={() => onSearch(values)}>
          {searchButtonText}
        </Button>
      )}
      {showResetButton && (
        <Button onClick={onReset}>{resetButtonText}</Button>
      )}
    </Space>
  );
};
