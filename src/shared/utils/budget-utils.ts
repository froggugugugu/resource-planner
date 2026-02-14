import type { Member, UnitPriceEntry } from '@/shared/types/member'
import type { Section } from '@/shared/types/section'

/**
 * 指定年度内でメンバーがアクティブな月のリストを返す
 *
 * @param startDate - メンバーの開始日 "YYYY-MM-DD"（nullの場合は空配列）
 * @param endDate - メンバーの終了日 "YYYY-MM-DD"（nullの場合は無期限）
 * @param fiscalYear - 対象年度（例: 2025）
 * @param startMonth - 年度開始月（例: 4 = 4月開始）
 * @returns アクティブ月の配列（"YYYY-MM" 形式）
 */
export function getActiveFiscalMonths(
  startDate: string | null,
  endDate: string | null,
  fiscalYear: number,
  startMonth: number,
): string[] {
  if (startDate === null) return []

  // 年度の開始月・終了月を計算
  const fyStartYear = fiscalYear
  const fyStartMonth = startMonth // 1-indexed

  let fyEndYear: number
  let fyEndMonth: number
  if (startMonth === 1) {
    fyEndYear = fiscalYear
    fyEndMonth = 12
  } else {
    fyEndYear = fiscalYear + 1
    fyEndMonth = startMonth - 1
  }

  const fyStart = `${fyStartYear}-${String(fyStartMonth).padStart(2, '0')}`
  const fyEnd = `${fyEndYear}-${String(fyEndMonth).padStart(2, '0')}`

  // メンバーの在籍期間をYYYY-MM形式に変換
  const memberStart = startDate.slice(0, 7) // "YYYY-MM-DD" → "YYYY-MM"
  const memberEnd = endDate ? endDate.slice(0, 7) : '9999-12'

  // 重複範囲の開始・終了を求める
  const overlapStart = fyStart > memberStart ? fyStart : memberStart
  const overlapEnd = fyEnd < memberEnd ? fyEnd : memberEnd

  if (overlapStart > overlapEnd) return []

  // overlapStart ～ overlapEnd の月リストを生成
  const months: string[] = []
  let [year, month] = overlapStart.split('-').map(Number) as [number, number]
  const [endY, endM] = overlapEnd.split('-').map(Number) as [number, number]

  while (year < endY || (year === endY && month <= endM)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`)
    month++
    if (month > 12) {
      month = 1
      year++
    }
  }

  return months
}

/**
 * 対象月に適用される単価を返す
 *
 * @param unitPriceHistory - 単価履歴の配列
 * @param targetMonth - 対象月 "YYYY-MM"
 * @returns 適用単価（エントリがない場合は0）
 */
export function getApplicableUnitPrice(
  unitPriceHistory: UnitPriceEntry[],
  targetMonth: string,
): number {
  if (unitPriceHistory.length === 0) return 0

  // effectiveFrom 昇順にソート
  const sorted = [...unitPriceHistory].sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  )

  let applicable = 0
  for (const entry of sorted) {
    if (entry.effectiveFrom <= targetMonth) {
      applicable = entry.amount
    } else {
      break
    }
  }

  return applicable
}

/**
 * メンバーの年間売上予算を計算する（フル稼働前提）
 *
 * @param member - 対象メンバー
 * @param fiscalYear - 対象年度
 * @param startMonth - 年度開始月
 * @returns 売上予算（万円）
 */
export function calcRevenueBudget(
  member: Member,
  fiscalYear: number,
  startMonth: number,
): number {
  const months = getActiveFiscalMonths(
    member.startDate,
    member.endDate,
    fiscalYear,
    startMonth,
  )

  return months.reduce((sum, month) => {
    return sum + getApplicableUnitPrice(member.unitPriceHistory, month)
  }, 0)
}

/**
 * メンバーの年間見込売上を計算する（アサイン率を反映）
 *
 * @param member - 対象メンバー
 * @param getMemberMonthlyTotal - アサイン率取得コールバック (memberId, monthKey) => number
 * @param fiscalYear - 対象年度
 * @param startMonth - 年度開始月
 * @returns 見込売上（万円）
 */
export function calcExpectedRevenue(
  member: Member,
  getMemberMonthlyTotal: (memberId: string, monthKey: string) => number,
  fiscalYear: number,
  startMonth: number,
): number {
  const months = getActiveFiscalMonths(
    member.startDate,
    member.endDate,
    fiscalYear,
    startMonth,
  )

  return months.reduce((sum, month) => {
    const unitPrice = getApplicableUnitPrice(member.unitPriceHistory, month)
    const rate = getMemberMonthlyTotal(member.id, month)
    return sum + unitPrice * rate
  }, 0)
}

/**
 * 課レベルの売上予算を計算する
 */
export function calcSectionBudget(
  members: Member[],
  fiscalYear: number,
  startMonth: number,
): number {
  return members.reduce(
    (sum, member) => sum + calcRevenueBudget(member, fiscalYear, startMonth),
    0,
  )
}

/**
 * 課レベルの見込売上を計算する
 */
export function calcSectionExpectedRevenue(
  members: Member[],
  getMemberMonthlyTotal: (memberId: string, monthKey: string) => number,
  fiscalYear: number,
  startMonth: number,
): number {
  return members.reduce(
    (sum, member) =>
      sum +
      calcExpectedRevenue(
        member,
        getMemberMonthlyTotal,
        fiscalYear,
        startMonth,
      ),
    0,
  )
}

/**
 * 部レベルの売上予算を計算する
 *
 * @param sections - 部門配下の課リスト
 * @param allMembers - 全メンバーリスト（sectionIdでフィルタする）
 * @param fiscalYear - 対象年度
 * @param startMonth - 年度開始月
 */
export function calcDivisionBudget(
  sections: Section[],
  allMembers: Member[],
  fiscalYear: number,
  startMonth: number,
): number {
  const sectionIds = new Set(sections.map((s) => s.id))
  const divisionMembers = allMembers.filter(
    (m) => m.sectionId !== null && sectionIds.has(m.sectionId),
  )
  return calcSectionBudget(divisionMembers, fiscalYear, startMonth)
}

/**
 * 部レベルの見込売上を計算する
 *
 * @param sections - 部門配下の課リスト
 * @param allMembers - 全メンバーリスト（sectionIdでフィルタする）
 * @param getMemberMonthlyTotal - アサイン率取得コールバック
 * @param fiscalYear - 対象年度
 * @param startMonth - 年度開始月
 */
export function calcDivisionExpectedRevenue(
  sections: Section[],
  allMembers: Member[],
  getMemberMonthlyTotal: (memberId: string, monthKey: string) => number,
  fiscalYear: number,
  startMonth: number,
): number {
  const sectionIds = new Set(sections.map((s) => s.id))
  const divisionMembers = allMembers.filter(
    (m) => m.sectionId !== null && sectionIds.has(m.sectionId),
  )
  return calcSectionExpectedRevenue(
    divisionMembers,
    getMemberMonthlyTotal,
    fiscalYear,
    startMonth,
  )
}
