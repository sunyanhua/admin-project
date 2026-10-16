import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Input, InputNumber, Space, Spin, Typography } from 'antd';
import { DeleteOutlined, HolderOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import ScrollableModal from '@/components/templates/ScrollableModal';
import { useAppNotification } from '@/hooks/useAppNotification';
import { confirmDelete } from '@/components/templates/ConfirmDelete';
import { settingsApi, SettingType, SettingItem } from '@/api/services/settings';
import {
  parseQuizValue,
  serializeQuiz,
  generateQuestionId,
  reorderQuizQuestions,
  QUIZ_SETTING_KEY,
  QUIZ_SETTING_GROUP,
  type QuizQuestion,
} from './quizConfig.utils';

const { Text } = Typography;

export interface QuizManageModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 默契问答管理弹窗（与承诺书模版管理同构）
 *
 * 业务流程：
 * 1. 打开时拉取 setting 接口中 key=activity_test 的最新值
 * 2. 本地编辑分数范围（正整数）与题目列表（一句话一题，可添加/删除/拖动排序）
 * 3. 点击「保存配置」把 { score_range, questions } JSON 化后写回 setting 接口
 *    - 已存在记录 → PATCH 更新 value
 *    - 不存在     → POST 创建（type=JSON, group=activity）
 */
const QuizManageModal: React.FC<QuizManageModalProps> = ({ open, onClose }) => {
  const { success, error: showError } = useAppNotification();
  const [scoreRange, setScoreRange] = useState<number | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [settingId, setSettingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // 拖动排序：dragIndex 为被拖动项索引，dragOverIndex 为当前悬停目标索引
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  /** 拖动结束（放下或取消）时清空拖拽状态 */
  const resetDrag = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  /** 把被拖动项移动到目标位置 */
  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) {
      resetDrag();
      return;
    }
    setQuestions((prev) => reorderQuizQuestions(prev, dragIndex, idx));
    resetDrag();
  };

  /** 拉取已保存的配置 */
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await settingsApi.getSettings({ keyword: QUIZ_SETTING_KEY, size: 100 });
      const list: SettingItem[] = res?.list ?? [];
      const item = list.find((s) => s.key === QUIZ_SETTING_KEY);
      if (item) {
        setSettingId(item.id);
        const parsed = parseQuizValue(item.value);
        setScoreRange(parsed.scoreRange);
        setQuestions(parsed.questions);
      } else {
        setSettingId('');
        setScoreRange(null);
        setQuestions([]);
      }
    } catch {
      setScoreRange(null);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchConfig();
  }, [open, fetchConfig]);

  /** 添加题目 */
  const handleAdd = () => {
    setQuestions((prev) => [...prev, { id: generateQuestionId(), text: '' }]);
  };

  /** 更新题目内容 */
  const handleTextChange = (id: string, text: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, text } : q)));
  };

  /** 删除题目（二次确认，与承诺书模版删除一致） */
  const handleDelete = (q: QuizQuestion, idx: number) => {
    confirmDelete({
      name: q.text.trim() || `第 ${idx + 1} 题`,
      deleteFn: async () => {
        setQuestions((prev) => prev.filter((item) => item.id !== q.id));
      },
      onSuccess: () => undefined,
    });
  };

  /** 保存：校验后 JSON 化写回 setting 接口 */
  const handleSave = async () => {
    if (scoreRange == null || !Number.isInteger(scoreRange) || scoreRange < 1) {
      showError('请输入正整数分数范围');
      return;
    }
    if (questions.length === 0) {
      showError('请至少添加一道题目');
      return;
    }
    const texts = questions.map((q) => q.text.trim());
    const emptyIdx = texts.findIndex((t) => !t);
    if (emptyIdx !== -1) {
      showError(`第 ${emptyIdx + 1} 题内容不能为空`);
      return;
    }

    setSaving(true);
    try {
      const value = serializeQuiz(scoreRange, texts);
      if (settingId) {
        await settingsApi.updateSetting(settingId, { value });
      } else {
        const createRes: any = await settingsApi.createSetting({
          key: QUIZ_SETTING_KEY,
          type: SettingType.JSON,
          value,
          group_name: QUIZ_SETTING_GROUP,
        });
        if (createRes?.id) setSettingId(createRes.id);
      }
      success('保存成功');
      onClose();
    } catch (err: any) {
      showError(err?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollableModal
      title="默契问答管理"
      open={open}
      onCancel={onClose}
      width={720}
      destroyOnHidden
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button icon={<PlusOutlined />} onClick={handleAdd}>
            添加题目
          </Button>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
              保存配置
            </Button>
          </Space>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>分数范围</span>
          <InputNumber
            min={1}
            precision={0}
            value={scoreRange ?? undefined}
            placeholder="正整数"
            style={{ width: 140 }}
            onChange={(v) => setScoreRange(v ?? null)}
          />
        </div>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>每个题目一句话；拖动左侧手柄可调整题目排序</div>
        {questions.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无题目，请添加" />
        ) : (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                onDragOver={(e) => {
                  e.preventDefault(); // 允许放置
                  e.dataTransfer.dropEffect = 'move';
                  if (dragIndex !== null && dragIndex !== idx) setDragOverIndex(idx);
                }}
                onDragLeave={(e) => {
                  // 离开卡片时清除悬停高亮（在子元素间移动不触发清除）
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverIndex((cur) => (cur === idx ? null : cur));
                  }
                }}
                onDrop={() => handleDrop(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: dragIndex === idx ? '1px dashed #1677ff' : '1px solid #e8e8e8',
                  borderRadius: 6,
                  background: '#fafafa',
                  padding: '6px 10px',
                  opacity: dragIndex === idx ? 0.5 : 1,
                  boxShadow: dragOverIndex === idx && dragIndex !== idx ? '0 0 0 2px #1677ff' : undefined,
                }}
              >
                <span
                  draggable
                  onDragStart={(e) => {
                    // Firefox 需要 setData 才会触发拖拽
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', String(idx));
                    setDragIndex(idx);
                  }}
                  onDragEnd={resetDrag}
                  title="拖动排序"
                  style={{ cursor: 'grab', color: '#999', display: 'inline-flex', padding: '4px 2px' }}
                >
                  <HolderOutlined />
                </span>
                <Text type="secondary" style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</Text>
                <Input
                  value={q.text}
                  placeholder="请输入题目（一句话）"
                  maxLength={200}
                  onChange={(e) => handleTextChange(q.id, e.target.value)}
                />
                <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(q, idx)}>
                  删除
                </Button>
              </div>
            ))}
          </Space>
        )}
      </Spin>
    </ScrollableModal>
  );
};

export default QuizManageModal;
