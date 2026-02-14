import type { EffortEntry } from '@/shared/types/effort'
import type { ProjectTreeNode } from '@/shared/types/project'

/**
 * 0.05刻みに丸める（nearest half-up）
 */
export function roundToHalf(value: number): number {
  return Math.round(value * 20) / 20
}

/**
 * 工数値（人日）を整数表示にフォーマット
 */
export function formatEffort(value: number): string {
  return value.toFixed(2)
}

/**
 * 入力文字列をパースして工数値に変換
 * - 空文字列 → 0
 * - 負の値 → null（無効）
 * - 有効な数値 → 0.05刻みに丸め
 */
export function parseEffortInput(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return 0
  const num = Number(trimmed)
  if (Number.isNaN(num)) return null
  if (num < 0) return null
  return roundToHalf(num)
}

/**
 * EffortEntryの配列からprojectId×columnIdで値を引くMap
 */
function buildEffortMap(efforts: EffortEntry[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of efforts) {
    map.set(`${e.projectId}:${e.columnId}`, e.value)
  }
  return map
}

/**
 * ロールアップ後の表示値を計算
 * Returns: Map<`${projectId}:${columnId}`, displayValue>
 *
 * - leaf行: effortsから直接取得（own value）
 * - non-leaf行: 子のdisplayValueの合計（読み取り専用）
 */
export function computeEffortDisplayValues(
  tree: ProjectTreeNode[],
  columnIds: string[],
  efforts: EffortEntry[],
): Map<string, number> {
  const effortMap = buildEffortMap(efforts)
  const result = new Map<string, number>()

  function walk(node: ProjectTreeNode): void {
    const isLeaf = node.children.length === 0

    for (const colId of columnIds) {
      if (isLeaf) {
        const val = effortMap.get(`${node.id}:${colId}`) ?? 0
        result.set(`${node.id}:${colId}`, val)
      } else {
        // 先に子を処理
        let sum = 0
        for (const child of node.children) {
          sum += result.get(`${child.id}:${colId}`) ?? 0
        }
        result.set(`${node.id}:${colId}`, roundToHalf(sum))
      }
    }
  }

  // post-order traversal: 子を先に処理してから親
  function postOrder(nodes: ProjectTreeNode[]): void {
    for (const node of nodes) {
      postOrder(node.children)
      walk(node)
    }
  }

  postOrder(tree)
  return result
}
