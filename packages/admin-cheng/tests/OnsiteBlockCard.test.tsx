import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockCard } from '@/components/operation/OnsiteBlockCard';
import type { BlockItem } from '@/components/operation/OnsiteBlockCard';

const personWithPhoto: BlockItem = { key: 'u2', label: '小红', kind: 'person', userId: 'u2', photo: 'https://cdn.example.com/p.jpg', number: 13, gender: 'female' };
const personNoPhoto: BlockItem = { key: 'u1', label: '小明', kind: 'person', userId: 'u1', number: 12, gender: 'male' };
const unregistered: BlockItem = { key: 'r3', label: '免报名用户', kind: 'person', userId: '', number: 15, gender: '' };
const groupItem: BlockItem = { key: 'g1', label: '第一组', kind: 'group' };

describe('OnsiteBlockCard', () => {
  it('有照片用户卡·未选中：亮度滤镜压暗（无黑蒙版），昵称条降亮，不显示已抽角标', () => {
    // Arrange / Act
    const { container } = render(<BlockCard item={personWithPhoto} state="normal" />);
    const img = container.querySelector('img') as HTMLImageElement;

    // Assert
    expect(img.style.filter).toBe('brightness(.55) saturate(.85)');
    expect(screen.queryByText('已抽')).toBeNull();
    expect((container.querySelector('.onsite-nick') as HTMLElement).style.opacity).toBe('0.55');
  });

  it('有照片用户卡·已抽：更深亮度滤镜 + 右上角「已抽」角标', () => {
    // Arrange / Act
    const { container } = render(<BlockCard item={personWithPhoto} state="drawn" />);
    const img = container.querySelector('img') as HTMLImageElement;

    // Assert
    expect(img.style.filter).toBe('brightness(.32) saturate(.5) grayscale(.5)');
    expect(screen.getByText('已抽')).toBeTruthy();
    expect((container.querySelector('.onsite-nick') as HTMLElement).style.opacity).toBe('0.35');
  });

  it('无照片的注册用户卡：12vw × 3:4 占位卡显示序号与昵称，不标注（未注册）', () => {
    // Arrange / Act
    const { container } = render(<BlockCard item={personNoPhoto} state="normal" />);
    const root = container.firstChild as HTMLElement;

    // Assert
    expect(root.style.width).toBe('12vw');
    expect(root.style.aspectRatio).toBe('3 / 4');
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('小明')).toBeTruthy();
    expect(screen.queryByText(/未注册/)).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('无照片且无 user_id 的免报名用户卡：昵称后标注（未注册）', () => {
    // Arrange / Act
    render(<BlockCard item={unregistered} state="normal" />);

    // Assert
    expect(screen.getByText('免报名用户（未注册）')).toBeTruthy();
  });

  it('组名方块：保持 10vw 方形，仅显示组名，不显示已抽角标与（未注册）标注', () => {
    // Arrange / Act
    const { container } = render(<BlockCard item={groupItem} state="drawn" />);
    const root = container.firstChild as HTMLElement;

    // Assert
    expect(root.style.width).toBe('10vw');
    expect(screen.getByText('第一组')).toBeTruthy();
    expect(screen.queryByText('已抽')).toBeNull();
    expect(screen.queryByText(/未注册/)).toBeNull();
  });
});
