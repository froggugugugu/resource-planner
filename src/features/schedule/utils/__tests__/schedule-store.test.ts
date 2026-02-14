import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock jsonStorage before importing store
vi.mock('@/infrastructure/storage', () => ({
  jsonStorage: {
    load: vi.fn(() => ({
      version: '1.0.0',
      fiscalYear: 2025,
      projects: [],
      members: [],
      scheduleEntries: [],
      dependencies: [],
      metadata: {
        lastModified: new Date().toISOString(),
        createdBy: 'system',
        version: '1.0.0',
      },
    })),
    save: vi.fn(),
  },
}))

// Mock crypto.randomUUID
let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => {
    uuidCounter++
    return `00000000-0000-0000-0000-${String(uuidCounter).padStart(12, '0')}`
  },
})

describe('useScheduleStore', () => {
  beforeEach(async () => {
    uuidCounter = 0
    // Reset store by re-importing
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function getStore() {
    const { useScheduleStore } = await import('@/stores/schedule-store')
    return useScheduleStore
  }

  it('should load schedule entries and dependencies', async () => {
    const store = await getStore()
    store.getState().loadSchedule()
    expect(store.getState().entries).toEqual([])
    expect(store.getState().dependencies).toEqual([])
  })

  it('should upsert a new entry', async () => {
    const store = await getStore()
    const projectId = '11111111-1111-1111-1111-111111111111'

    store
      .getState()
      .upsertEntry(projectId, 'phase-1', '2025-04-01', '2025-06-30')

    const entries = store.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0]?.projectId).toBe(projectId)
    expect(entries[0]?.phaseKey).toBe('phase-1')
    expect(entries[0]?.startDate).toBe('2025-04-01')
    expect(entries[0]?.endDate).toBe('2025-06-30')
  })

  it('should update an existing entry', async () => {
    const store = await getStore()
    const projectId = '11111111-1111-1111-1111-111111111111'

    store
      .getState()
      .upsertEntry(projectId, 'phase-1', '2025-04-01', '2025-06-30')
    store
      .getState()
      .upsertEntry(projectId, 'phase-1', '2025-05-01', '2025-07-31')

    const entries = store.getState().entries
    expect(entries).toHaveLength(1)
    expect(entries[0]?.startDate).toBe('2025-05-01')
    expect(entries[0]?.endDate).toBe('2025-07-31')
  })

  it('should delete an entry', async () => {
    const store = await getStore()
    const projectId = '11111111-1111-1111-1111-111111111111'

    store
      .getState()
      .upsertEntry(projectId, 'phase-1', '2025-04-01', '2025-06-30')
    store.getState().deleteEntry(projectId, 'phase-1')

    expect(store.getState().entries).toHaveLength(0)
  })

  it('should delete all entries for a project', async () => {
    const store = await getStore()
    const projectId = '11111111-1111-1111-1111-111111111111'

    store
      .getState()
      .upsertEntry(projectId, 'phase-1', '2025-04-01', '2025-06-30')
    store
      .getState()
      .upsertEntry(projectId, 'phase-2', '2025-07-01', '2025-09-30')
    store.getState().deleteByProject(projectId)

    expect(store.getState().entries).toHaveLength(0)
  })

  it('should add a dependency', async () => {
    const store = await getStore()
    const projectId = '11111111-1111-1111-1111-111111111111'

    store.getState().addDependency(projectId, 'phase-1', 'phase-2', 'FS')

    const deps = store.getState().dependencies
    expect(deps).toHaveLength(1)
    expect(deps[0]?.fromPhaseKey).toBe('phase-1')
    expect(deps[0]?.toPhaseKey).toBe('phase-2')
    expect(deps[0]?.dependencyType).toBe('FS')
  })

  it('should not add duplicate dependency', async () => {
    const store = await getStore()
    const projectId = '11111111-1111-1111-1111-111111111111'

    store.getState().addDependency(projectId, 'phase-1', 'phase-2', 'FS')
    store.getState().addDependency(projectId, 'phase-1', 'phase-2', 'SS')

    expect(store.getState().dependencies).toHaveLength(1)
  })

  it('should delete a dependency', async () => {
    const store = await getStore()
    const projectId = '11111111-1111-1111-1111-111111111111'

    store.getState().addDependency(projectId, 'phase-1', 'phase-2', 'FS')
    const depId = store.getState().dependencies[0]?.id ?? ''
    store.getState().deleteDependency(depId)

    expect(store.getState().dependencies).toHaveLength(0)
  })

  it('should get entries by project', async () => {
    const store = await getStore()
    const projectA = '11111111-1111-1111-1111-111111111111'
    const projectB = '22222222-2222-2222-2222-222222222222'

    store
      .getState()
      .upsertEntry(projectA, 'phase-1', '2025-04-01', '2025-06-30')
    store
      .getState()
      .upsertEntry(projectB, 'phase-1', '2025-07-01', '2025-09-30')

    expect(store.getState().getEntriesByProject(projectA)).toHaveLength(1)
    expect(store.getState().getEntriesByProject(projectB)).toHaveLength(1)
  })

  it('should get dependencies by project', async () => {
    const store = await getStore()
    const projectA = '11111111-1111-1111-1111-111111111111'

    store.getState().addDependency(projectA, 'phase-1', 'phase-2', 'FS')

    expect(store.getState().getDependenciesByProject(projectA)).toHaveLength(1)
    expect(store.getState().getDependenciesByProject('other-id')).toHaveLength(
      0,
    )
  })
})
