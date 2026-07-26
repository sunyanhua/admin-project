import { useState } from 'react';
import { Form, Select, Tag } from 'antd';
import { productApi } from '@/api/services/product';

// ---- 类型 ----

export interface CategoryNode {
  id: number;
  name: string;
  children?: CategoryNode[];
}

export interface ProductOption {
  value: number;
  label: string;
}

export const SCOPE_TYPE_OPTIONS = [
  { label: '全场通用', value: 'all' },
  { label: '指定分类', value: 'category' },
  { label: '指定产品', value: 'product' },
];

// ---- 组件 ----

export interface ScopeFieldsProps {
  form: any;
  productLabels: ProductOption[];
  setProductLabels: React.Dispatch<React.SetStateAction<ProductOption[]>>;
  categories: CategoryNode[];
}

const ScopeFields: React.FC<ScopeFieldsProps> = ({ form, productLabels, setProductLabels, categories }) => {
  const scopeType = Form.useWatch('scope_type', form);
  const [searchResults, setSearchResults] = useState<ProductOption[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const selectedIds: number[] = Form.useWatch('product_ids', form) || [];

  const doSearch = async (keyword: string) => {
    setSearchValue(keyword);
    if (!keyword || keyword.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res: any = await productApi.getProducts({ keyword, page: 1, page_size: 20 });
      const list: any[] = res?.list || [];
      const selectedSet = new Set(selectedIds);
      setSearchResults(list.filter((p: any) => !selectedSet.has(p.id)).map((p: any) => ({ value: p.id, label: p.title })));
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const addProduct = (item: ProductOption) => {
    form.setFieldsValue({ product_ids: [...selectedIds, item.value] });
    setProductLabels((prev) => [...prev, item]);
    setSearchValue(''); setSearchResults([]);
  };

  const removeProduct = (id: number) => {
    form.setFieldsValue({ product_ids: selectedIds.filter((v: number) => v !== id) });
    setProductLabels((prev) => prev.filter((p) => p.value !== id));
  };

  return (
    <>
      <Form.Item name="scope_type" label="适用范围" initialValue="all" rules={[{ required: true }]}>
        <Select
          options={SCOPE_TYPE_OPTIONS}
          onChange={() => { form.setFieldsValue({ category_ids: undefined, product_ids: undefined }); setProductLabels([]); }}
        />
      </Form.Item>
      {scopeType === 'category' && (
        <Form.Item name="category_ids" label="选择分类" rules={[{ required: true, message: '请选择至少一个分类' }]}>
          <Select mode="multiple" placeholder="请选择一级分类" style={{ width: '100%' }} fieldNames={{ label: 'name', value: 'id' }} options={categories} />
        </Form.Item>
      )}
      {scopeType === 'product' && (
        <div style={{ marginBottom: 24 }}>
          <Form.Item name="product_ids" label="选择产品" rules={[{ required: true, message: '请选择至少一个产品' }]} style={{ marginBottom: 8 }}>
            <input type="hidden" />
          </Form.Item>
          <div style={{ paddingLeft: 0 }}>
            <div style={{ marginBottom: 8 }}>
              {productLabels.map((p) => (
                <Tag key={p.value} closable onClose={() => removeProduct(p.value)} style={{ marginBottom: 4 }}>{p.label}</Tag>
              ))}
              {productLabels.length === 0 && <span style={{ color: '#999' }}>请在下拉框中搜索并选择产品</span>}
            </div>
            <Select
              showSearch value={undefined} placeholder="输入关键词搜索产品" filterOption={false} loading={searching}
              style={{ width: '100%' }} searchValue={searchValue}
              onSearch={(val) => doSearch(val)}
              onSelect={(val: number) => { const found = searchResults.find((r) => r.value === val); if (found) addProduct(found); }}
              onBlur={() => { setSearchValue(''); setSearchResults([]); }}
              options={searchResults.map((r) => ({ ...r }))}
              notFoundContent={searching ? '搜索中...' : (searchValue ? '未找到匹配产品' : '输入关键词开始搜索')}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ScopeFields;
