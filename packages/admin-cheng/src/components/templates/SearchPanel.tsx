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
  inputWidth?: number;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  filters,
  values,
  onChange,
  onSearch,
  onReset,
  searchButtonText = '搜索',
  resetButtonText = '重置',
  inputWidth = 200,
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

  // 渲染顺序：下拉框在前，输入框在后（输入框紧贴搜索按钮）
  const sorted = [...filters].sort((a, b) => {
    if (a.type === b.type) return 0;
    return a.type === 'select' ? -1 : 1;
  });

  return (
    <Space wrap>
      {sorted.map((filter) => (
        <React.Fragment key={filter.name}>
          {filter.type === 'select' ? (
            <Select
              placeholder={filter.placeholder}
              value={values[filter.name]}
              onChange={(value) => handleSelectChange(filter.name, value)}
              allowClear
              style={{ minWidth: 120 }}
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
              onChange={(e) => {
                const next = e.target.value;
                onChange(filter.name, next);
                // 点击 × 清空关键词时自动重新加载名单
                if (next === '' && values[filter.name]) {
                  onSearch({ ...values, [filter.name]: '' });
                }
              }}
              onKeyPress={handleKeyPress}
              allowClear
              style={{ width: inputWidth }}
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
