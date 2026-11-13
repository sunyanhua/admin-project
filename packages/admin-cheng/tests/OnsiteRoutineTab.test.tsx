import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import OnsiteRoutineTab from '@/components/operation/OnsiteRoutineTab';

/** 已保存编排：幸运之星（2人/混搭/备注）+ 单组选人（一组/2人），onsite_config 含其他键 */
const ACTIVITY = vi.hoisted(() => ({
  id: 'a1',
  title: '测试活动',
  activity_type: 0,
  onsite_config: JSON.stringify({
    bg_screen: 'https://cdn.example.com/bg.png',
    groups: '一|二',
    routine: [
      { type: 'lucky', count: 2, gender: 'mix', note: '第1轮' },
      { type: 'personDraw', group: '一', count: 2 },
    ],
  }),
}));

/** 单组选人未选择分组（保存应被拦截） */
const ACTIVITY_BAD = vi.hoisted(() => ({
  id: 'a1',
  title: '测试活动',
  activity_type: 0,
  onsite_config: JSON.stringify({
    groups: '一|二',
    routine: [{ type: 'personDraw', count: 1 }],
  }),
}));

/** 组中选组带指定结果（fixed）：抽中的组已指定 */
const ACTIVITY_FIXED = vi.hoisted(() => ({
  id: 'a1',
  title: '测试活动',
  activity_type: 0,
  onsite_config: JSON.stringify({
    bg_screen: 'https://cdn.example.com/bg.png',
    groups: '一|二|三',
    routine: [{ type: 'groupDraw', fixed: ['一', '三'] }],
  }),
}));

/** 组中选组指定结果引用了不存在的分组（保存应被拦截） */
const ACTIVITY_FIXED_BAD = vi.hoisted(() => ({
  id: 'a1',
  title: '测试活动',
  activity_type: 0,
  onsite_config: JSON.stringify({
    groups: '一|二',
    routine: [{ type: 'groupDraw', fixed: ['一', '三'] }],
  }),
}));

const updateMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('@/api/services/activity-v1', () => ({
  activityApi: {
    getDetail: vi.fn().mockResolvedValue(ACTIVITY),
    update: updateMock,
  },
}));

beforeAll(() => {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
});

beforeEach(() => {
  updateMock.mockClear();
});

/** 按按钮完整文字查找（忽略 antd 两字按钮插空格与图标名） */
const btnByText = (text: string) =>
  screen.getAllByRole('button').find((b) => (b.textContent || '').replace(/\s/g, '') === text)!;

describe('OnsiteRoutineTab', () => {
  it('回填已保存的编排步骤与参数', async () => {
    render(
      <App>
        <OnsiteRoutineTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => {
      expect(screen.getAllByText('幸运之星').length).toBeGreaterThan(0);
      expect(screen.getAllByText('单组选人').length).toBeGreaterThan(0);
    });
    // 步骤1参数：人数 2（InputNumber 输入框值）、备注 第1轮
    const spins = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(spins[0].value).toBe('2');
    expect(screen.getByDisplayValue('第1轮')).toBeTruthy();
    expect(screen.getAllByTitle('删除本步').length).toBe(2);
  });

  it('填写流程名称后保存：routine 步骤序列化包含 name', async () => {
    render(
      <App>
        <OnsiteRoutineTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => expect(screen.getAllByTitle('删除本步').length).toBe(2));
    // 第 1 步（幸运之星）填写流程名称
    const nameInputs = screen.getAllByPlaceholderText(/流程名称/);
    await userEvent.type(nameInputs[0], '开场幸运抽');
    await userEvent.click(btnByText('保存'));
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      const payload = updateMock.mock.calls[0][1];
      const obj = JSON.parse(payload.onsite_config);
      expect(obj.routine[0]).toEqual({ type: 'lucky', count: 2, gender: 'mix', note: '第1轮', name: '开场幸运抽' });
    });
  });

  it('添加与删除步骤', async () => {
    render(
      <App>
        <OnsiteRoutineTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => expect(screen.getAllByTitle('删除本步').length).toBe(2));
    await userEvent.click(btnByText('添加步骤'));
    expect(screen.getAllByTitle('删除本步').length).toBe(3);
    await userEvent.click(screen.getAllByTitle('删除本步')[0]);
    expect(screen.getAllByTitle('删除本步').length).toBe(2);
  });

  it('保存：onsite_config 原对象透传（保留 bg_screen/groups），routine 更新为当前步骤', async () => {
    render(
      <App>
        <OnsiteRoutineTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    const note = await screen.findByDisplayValue('第1轮');
    fireEvent.change(note, { target: { value: '开场抽奖' } });
    await userEvent.click(btnByText('保存'));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      const payload = updateMock.mock.calls[0][1];
      const obj = JSON.parse(payload.onsite_config);
      expect(obj.bg_screen).toBe('https://cdn.example.com/bg.png');
      expect(obj.groups).toBe('一|二');
      expect(obj.routine).toEqual([
        { type: 'lucky', count: 2, gender: 'mix', note: '开场抽奖' },
        { type: 'personDraw', group: '一', count: 2, gender: 'mix' },
      ]);
    });
  });

  it('单组选人未选择分组时保存被拦截（不调接口）', async () => {
    render(
      <App>
        <OnsiteRoutineTab activityId="a1" activity={ACTIVITY_BAD as any} />
      </App>,
    );
    await waitFor(() => expect(screen.getAllByText('单组选人').length).toBeGreaterThan(0));
    await userEvent.click(btnByText('保存'));
    await waitFor(() => {
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  it('组中选组指定结果：回填选中分组，保存序列化 fixed（不存 count）', async () => {
    render(
      <App>
        <OnsiteRoutineTab activityId="a1" activity={ACTIVITY_FIXED as any} />
      </App>,
    );
    // 回填：多选框中显示已指定的分组
    await waitFor(() => {
      expect(screen.getByText('一组')).toBeTruthy();
      expect(screen.getByText('三组')).toBeTruthy();
    });
    await userEvent.click(btnByText('保存'));
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalled();
      const obj = JSON.parse(updateMock.mock.calls[0][1].onsite_config);
      expect(obj.bg_screen).toBe('https://cdn.example.com/bg.png');
      expect(obj.groups).toBe('一|二|三');
      expect(obj.routine).toEqual([{ type: 'groupDraw', fixed: ['一', '三'] }]);
    });
  });

  it('组中选组指定结果引用不存在的分组时保存被拦截（不调接口）', async () => {
    render(
      <App>
        <OnsiteRoutineTab activityId="a1" activity={ACTIVITY_FIXED_BAD as any} />
      </App>,
    );
    await waitFor(() => expect(screen.getAllByText('组中选组').length).toBeGreaterThan(0));
    await userEvent.click(btnByText('保存'));
    await waitFor(() => {
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  it('清空全部步骤后保存：routine 键被删除，其他键保留', async () => {
    render(
      <App>
        <OnsiteRoutineTab activityId="a1" activity={ACTIVITY as any} />
      </App>,
    );
    await waitFor(() => expect(screen.getAllByTitle('删除本步').length).toBe(2));
    await userEvent.click(screen.getAllByTitle('删除本步')[0]);
    await userEvent.click(screen.getAllByTitle('删除本步')[0]);
    await userEvent.click(btnByText('保存'));

    await waitFor(() => {
      const obj = JSON.parse(updateMock.mock.calls[0][1].onsite_config);
      expect(obj.routine).toBeUndefined();
      expect(obj.bg_screen).toBe('https://cdn.example.com/bg.png');
      expect(obj.groups).toBe('一|二');
    });
  });
});
