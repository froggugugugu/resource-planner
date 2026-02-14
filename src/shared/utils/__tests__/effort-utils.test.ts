import { describe, expect, it } from 'vitest'
import type { EffortEntry } from '@/shared/types/effort'
import type { ProjectTreeNode } from '@/shared/types/project'
import {
  computeEffortDisplayValues,
  formatEffort,
  parseEffortInput,
  roundToHalf,
} from '@/shared/utils/effort-utils'

describe('roundToHalf', () => {
  it.each([
    [0.01, 0.0],
    [0.02, 0.0],
    [0.03, 0.05],
    [0.04, 0.05],
    [0.05, 0.05],
    [0.07, 0.05],
    [0.08, 0.1],
    [0.1, 0.1],
    [0.12, 0.1],
    [0.13, 0.15],
    [0.0, 0.0],
    [1.0, 1.0],
    [0.025, 0.05], // boundary: exactly halfway rounds up
  ])('roundToHalf(%f) === %f', (input, expected) => {
    expect(roundToHalf(input)).toBeCloseTo(expected, 10)
  })
})

describe('formatEffort', () => {
  it('formats to 2 decimal places', () => {
    expect(formatEffort(0)).toBe('0.00')
    expect(formatEffort(0.05)).toBe('0.05')
    expect(formatEffort(0.1)).toBe('0.10')
    expect(formatEffort(1)).toBe('1.00')
    expect(formatEffort(12.35)).toBe('12.35')
  })
})

describe('parseEffortInput', () => {
  it('returns 0 for empty string', () => {
    expect(parseEffortInput('')).toBe(0)
    expect(parseEffortInput('  ')).toBe(0)
  })

  it('returns null for negative values', () => {
    expect(parseEffortInput('-1')).toBeNull()
    expect(parseEffortInput('-0.5')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseEffortInput('abc')).toBeNull()
    expect(parseEffortInput('1.2.3')).toBeNull()
  })

  it('rounds valid input to 0.05 steps', () => {
    expect(parseEffortInput('0.03')).toBeCloseTo(0.05)
    expect(parseEffortInput('0.07')).toBeCloseTo(0.05)
    expect(parseEffortInput('0.08')).toBeCloseTo(0.1)
    expect(parseEffortInput('0.1')).toBeCloseTo(0.1)
    expect(parseEffortInput('0')).toBe(0)
  })
})

// Helper to create a tree node
function makeNode(
  id: string,
  level: number,
  children: ProjectTreeNode[] = [],
): ProjectTreeNode {
  return {
    id,
    code: `P${id}`,
    name: `Project ${id}`,
    parentId: level === 0 ? null : 'parent',
    level,
    status: 'not_started' as const,
    confidence: null,
    depth: level,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    children,
  }
}

describe('computeEffortDisplayValues', () => {
  it('returns own value for leaf nodes', () => {
    const leaf = makeNode('1', 1)
    const tree = [makeNode('root', 0, [leaf])]
    const efforts: EffortEntry[] = [
      { id: 'e1', projectId: '1', columnId: 'effort-1', value: 0.5 },
    ]

    const result = computeEffortDisplayValues(tree, ['effort-1'], efforts)
    expect(result.get('1:effort-1')).toBe(0.5)
  })

  it('returns 0 for leaf with no effort entry', () => {
    const leaf = makeNode('1', 1)
    const tree = [makeNode('root', 0, [leaf])]

    const result = computeEffortDisplayValues(tree, ['effort-1'], [])
    expect(result.get('1:effort-1')).toBe(0)
  })

  it('rolls up children values to parent', () => {
    const child1 = makeNode('c1', 2)
    const child2 = makeNode('c2', 2)
    const parent = makeNode('p1', 1, [child1, child2])
    const root = makeNode('root', 0, [parent])
    const tree = [root]

    const efforts: EffortEntry[] = [
      { id: 'e1', projectId: 'c1', columnId: 'effort-1', value: 0.3 },
      { id: 'e2', projectId: 'c2', columnId: 'effort-1', value: 0.2 },
    ]

    const result = computeEffortDisplayValues(tree, ['effort-1'], efforts)
    expect(result.get('c1:effort-1')).toBe(0.3)
    expect(result.get('c2:effort-1')).toBe(0.2)
    expect(result.get('p1:effort-1')).toBe(0.5)
    expect(result.get('root:effort-1')).toBe(0.5)
  })

  it('handles multiple columns independently', () => {
    const child1 = makeNode('c1', 1)
    const child2 = makeNode('c2', 1)
    const root = makeNode('root', 0, [child1, child2])
    const tree = [root]

    const efforts: EffortEntry[] = [
      { id: 'e1', projectId: 'c1', columnId: 'effort-1', value: 0.1 },
      { id: 'e2', projectId: 'c2', columnId: 'effort-1', value: 0.2 },
      { id: 'e3', projectId: 'c1', columnId: 'effort-2', value: 0.5 },
      { id: 'e4', projectId: 'c2', columnId: 'effort-2', value: 0.3 },
    ]

    const result = computeEffortDisplayValues(
      tree,
      ['effort-1', 'effort-2'],
      efforts,
    )
    expect(result.get('root:effort-1')).toBe(0.3)
    expect(result.get('root:effort-2')).toBe(0.8)
  })

  it('ignores own value for non-leaf nodes (uses children sum only)', () => {
    const child = makeNode('c1', 2)
    const parent = makeNode('p1', 1, [child])
    const tree = [makeNode('root', 0, [parent])]

    // parent has own effort entry, but since it has children, should use children sum
    const efforts: EffortEntry[] = [
      { id: 'e1', projectId: 'p1', columnId: 'effort-1', value: 999 },
      { id: 'e2', projectId: 'c1', columnId: 'effort-1', value: 0.15 },
    ]

    const result = computeEffortDisplayValues(tree, ['effort-1'], efforts)
    expect(result.get('p1:effort-1')).toBe(0.15) // children sum, not own value
    expect(result.get('c1:effort-1')).toBe(0.15)
  })

  it('preserves own value in efforts array (not deleted) when node becomes non-leaf', () => {
    // This tests that the efforts array is not modified - own value records persist
    const child = makeNode('c1', 2)
    const parent = makeNode('p1', 1, [child])
    const tree = [makeNode('root', 0, [parent])]

    const efforts: EffortEntry[] = [
      { id: 'e1', projectId: 'p1', columnId: 'effort-1', value: 0.5 },
      { id: 'e2', projectId: 'c1', columnId: 'effort-1', value: 0.2 },
    ]

    computeEffortDisplayValues(tree, ['effort-1'], efforts)
    // Original efforts array should be unchanged
    expect(efforts).toHaveLength(2)
    expect(efforts[0]?.value).toBe(0.5) // own value preserved in data
  })

  it('restores own value when non-leaf becomes leaf again', () => {
    // First: node is leaf with own value
    const nodeAsLeaf = makeNode('p1', 1)
    const tree1 = [makeNode('root', 0, [nodeAsLeaf])]
    const efforts: EffortEntry[] = [
      { id: 'e1', projectId: 'p1', columnId: 'effort-1', value: 0.5 },
    ]

    const result1 = computeEffortDisplayValues(tree1, ['effort-1'], efforts)
    expect(result1.get('p1:effort-1')).toBe(0.5) // shows own value as leaf

    // Second: node becomes non-leaf (display shows children sum)
    const child = makeNode('c1', 2)
    const nodeAsParent = makeNode('p1', 1, [child])
    const tree2 = [makeNode('root', 0, [nodeAsParent])]

    const result2 = computeEffortDisplayValues(tree2, ['effort-1'], efforts)
    expect(result2.get('p1:effort-1')).toBe(0) // children sum (child has no effort)

    // Third: children removed, node is leaf again — own value restored
    const nodeAsLeafAgain = makeNode('p1', 1)
    const tree3 = [makeNode('root', 0, [nodeAsLeafAgain])]

    const result3 = computeEffortDisplayValues(tree3, ['effort-1'], efforts)
    expect(result3.get('p1:effort-1')).toBe(0.5) // restored from efforts
  })
})
