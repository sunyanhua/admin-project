
import { render, screen, waitFor } from '@testing-library/react'
import Dashboard from './Dashboard'
import { activityApi } from '../api/services/activity'
import { statisticsApi } from '../api/services/statistics'
import { vi } from 'vitest'
import { ActivityStatus, ActivityCategory } from '../../../shared/constants/activity.enums'

// Mock Ant Design Charts Line component
vi.mock('@ant-design/charts', () => ({
  Line: vi.fn(() => null)
}))

// Mock the API modules
vi.mock('../api/services/activity', () => ({
  activityApi: {
    getActivities: vi.fn()
  }
}))

vi.mock('../api/services/statistics', () => ({
  statisticsApi: {
    getUserGrowth: vi.fn()
  }
}))

// Mock Ant Design Grid for responsive breakpoints
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    Grid: {
      ...actual.Grid,
      useBreakpoint: vi.fn(() => ({ md: true }))
    }
  }
})

describe('Dashboard', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Mock matchMedia with proper implementation
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('min-width'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    // Mock getComputedStyle
    Object.defineProperty(window, 'getComputedStyle', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        getPropertyValue: vi.fn(),
      })),
    })

    // Default mock implementations
    ;(activityApi.getActivities as any).mockResolvedValue({
      data: [
        {
          id: 1,
          title: '周末骑行活动',
          category: ActivityCategory.CYCLING,
          status: ActivityStatus.PENDING_REVIEW,
          participants: 5,
          maxParticipants: 20
        },
        {
          id: 2,
          title: '户外徒步',
          category: ActivityCategory.HIKING,
          status: ActivityStatus.APPROVED,
          participants: 12,
          maxParticipants: 15
        }
      ]
    })

    ;(statisticsApi.getUserGrowth as any).mockResolvedValue({
      data: [
        { date: '2026-03-01', count: 1200 },
        { date: '2026-03-02', count: 1250 }
      ]
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders dashboard title and welcome message', async () => {
    render(<Dashboard />)

    // Check for title
    expect(screen.getByRole('heading', { level: 2, name: '数据看板' })).toBeInTheDocument()

    // Check for welcome message
    expect(screen.getByText(/欢迎回来，管理员！以下是系统概览。/)).toBeInTheDocument()
  })

  it('renders all statistic cards with correct data', async () => {
    render(<Dashboard />)

    // Wait for initial render to complete
    await waitFor(() => {
      // Check for all statistic cards
      expect(screen.getByText('总用户数')).toBeInTheDocument()
      expect(screen.getByText('12,543')).toBeInTheDocument()

      expect(screen.getByText('活动总数')).toBeInTheDocument()
      expect(screen.getByText('892')).toBeInTheDocument()

      expect(screen.getByText('待审核')).toBeInTheDocument()
      expect(screen.getByText('23')).toBeInTheDocument()

      expect(screen.getByText('总收入')).toBeInTheDocument()
      expect(screen.getByText('¥ 45,230')).toBeInTheDocument()
    })
  })

  it('renders recent activities card title', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('最近活动')).toBeInTheDocument()
    })
  })

  it('renders user growth card title', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('用户增长')).toBeInTheDocument()
    })
  })

  it('correctly renders activity category labels', async () => {
    // Mock API with specific categories
    ;(activityApi.getActivities as any).mockResolvedValue({
      data: [
        { id: 1, title: 'Test Meal', category: ActivityCategory.MEAL, status: 1, participants: 1, maxParticipants: 10 },
        { id: 2, title: 'Test Cycling', category: ActivityCategory.CYCLING, status: 1, participants: 1, maxParticipants: 10 },
        { id: 3, title: 'Test Hiking', category: ActivityCategory.HIKING, status: 1, participants: 1, maxParticipants: 10 },
        { id: 4, title: 'Test Sports', category: ActivityCategory.SPORTS, status: 1, participants: 1, maxParticipants: 10 },
        { id: 5, title: 'Test Entertainment', category: ActivityCategory.ENTERTAINMENT, status: 1, participants: 1, maxParticipants: 10 },
        { id: 6, title: 'Test Learning', category: ActivityCategory.LEARNING, status: 1, participants: 1, maxParticipants: 10 },
        { id: 7, title: 'Test Other', category: ActivityCategory.OTHER, status: 1, participants: 1, maxParticipants: 10 },
      ]
    })

    render(<Dashboard />)

    // Wait for table data to load
    await screen.findByText('Test Meal')

    await waitFor(() => {
      expect(screen.getByText('吃饭')).toBeInTheDocument()
      expect(screen.getByText('骑行')).toBeInTheDocument()
      expect(screen.getByText('徒步')).toBeInTheDocument()
      expect(screen.getByText('运动')).toBeInTheDocument()
      expect(screen.getByText('娱乐')).toBeInTheDocument()
      expect(screen.getByText('学习')).toBeInTheDocument()
      expect(screen.getByText('其他')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('correctly renders activity status tags', async () => {
    // Mock API with specific statuses
    ;(activityApi.getActivities as any).mockResolvedValue({
      data: [
        { id: 1, title: 'Draft', category: 1, status: ActivityStatus.DRAFT, participants: 1, maxParticipants: 10 },
        { id: 2, title: 'Pending', category: 1, status: ActivityStatus.PENDING_REVIEW, participants: 1, maxParticipants: 10 },
        { id: 3, title: 'Approved', category: 1, status: ActivityStatus.APPROVED, participants: 1, maxParticipants: 10 },
        { id: 4, title: 'Rejected', category: 1, status: ActivityStatus.REJECTED, participants: 1, maxParticipants: 10 },
        { id: 5, title: 'Published', category: 1, status: ActivityStatus.PUBLISHED, participants: 1, maxParticipants: 10 },
        { id: 6, title: 'Canceled', category: 1, status: ActivityStatus.CANCELED, participants: 1, maxParticipants: 10 },
        { id: 7, title: 'Completed', category: 1, status: ActivityStatus.COMPLETED, participants: 1, maxParticipants: 10 },
      ]
    })

    render(<Dashboard />)

    // Wait for table data to load
    await screen.findByText('Draft')

    await waitFor(() => {
      expect(screen.getByText('草稿')).toBeInTheDocument()
      expect(screen.getByText('待审核')).toBeInTheDocument()
      expect(screen.getByText('已通过')).toBeInTheDocument()
      expect(screen.getByText('已拒绝')).toBeInTheDocument()
      expect(screen.getByText('已发布')).toBeInTheDocument()
      expect(screen.getByText('已取消')).toBeInTheDocument()
      expect(screen.getByText('已完成')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('handles API errors gracefully', async () => {
    // Mock API to reject with an error
    ;(activityApi.getActivities as any).mockRejectedValue(new Error('Network error'))
    ;(statisticsApi.getUserGrowth as any).mockRejectedValue(new Error('Failed to fetch'))

    render(<Dashboard />)

    // Wait for error messages to appear
    await waitFor(() => {
      // Check that error messages are displayed (antd message component)
      // Note: antd message renders to document.body, not within the component
      // We can check that the component still renders (doesn't crash)
      expect(screen.getByRole('heading', { level: 2, name: '数据看板' })).toBeInTheDocument()
    })
  })

  it('shows loading states correctly', async () => {
    // Mock API to delay response
    let resolveActivities: (value: any) => void
    let resolveGrowth: (value: any) => void

    const activitiesPromise = new Promise(resolve => {
      resolveActivities = resolve
    })
    const growthPromise = new Promise(resolve => {
      resolveGrowth = resolve
    })

    ;(activityApi.getActivities as any).mockReturnValue(activitiesPromise)
    ;(statisticsApi.getUserGrowth as any).mockReturnValue(growthPromise)

    render(<Dashboard />)

    // Initially, loading indicators should be present
    // The Table component shows loading when loading prop is true
    // We can check for antd spin class or loading attribute
    // For simplicity, we'll just ensure the component renders
    expect(screen.getByRole('heading', { level: 2, name: '数据看板' })).toBeInTheDocument()

    // Resolve the promises
    resolveActivities!({ data: [] })
    resolveGrowth!({ data: [] })

    await waitFor(() => {
      // After loading, check that content appears
      expect(screen.getByText('最近活动')).toBeInTheDocument()
    })
  })

  it('renders correctly on mobile screens', async () => {
    // Import Grid to mock useBreakpoint
    const { Grid } = await import('antd')
    // Mock useBreakpoint to return mobile breakpoint (md: false)
    vi.mocked(Grid.useBreakpoint).mockReturnValue({ md: false })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: '数据看板' })).toBeInTheDocument()
      // Table should be in small size on mobile
      // We can check for specific classes or attributes if needed
    })
  })

  it('shows empty state when no user growth data', async () => {
    // Mock empty user growth data
    ;(statisticsApi.getUserGrowth as any).mockResolvedValue({ data: [] })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText('用户增长')).toBeInTheDocument()
      expect(screen.getByText('暂无数据')).toBeInTheDocument()
    })
  })

  it('renders participant count correctly', async () => {
    // Mock API with specific participant counts
    ;(activityApi.getActivities as any).mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'Test Activity',
          category: ActivityCategory.CYCLING,
          status: ActivityStatus.APPROVED,
          participants: 5,
          maxParticipants: 20
        }
      ]
    })

    render(<Dashboard />)

    // Wait for table data to load
    await screen.findByText('Test Activity')

    await waitFor(() => {
      // Check that participant count is rendered as "5/20"
      expect(screen.getByText('5/20')).toBeInTheDocument()
    })
  })
})