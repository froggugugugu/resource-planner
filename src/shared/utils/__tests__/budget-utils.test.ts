import { describe, expect, it } from 'vitest'
import type { Member, UnitPriceEntry } from '@/shared/types/member'
import type { Section } from '@/shared/types/section'
import {
  calcDivisionBudget,
  calcDivisionExpectedRevenue,
  calcExpectedRevenue,
  calcRevenueBudget,
  calcSectionBudget,
  calcSectionExpectedRevenue,
  getActiveFiscalMonths,
  getApplicableUnitPrice,
} from '@/shared/utils/budget-utils'

// ヘルパー: テスト用メンバーを生成
function createTestMember(
  overrides: Partial<Member> & { startDate: string | null },
): Member {
  const { startDate, ...rest } = overrides
  return {
    id: 'member-1',
    name: 'テスト太郎',
    department: '',
    sectionId: null,
    role: 'エンジニア',
    isActive: true,
    techTagIds: [],
    startDate,
    endDate: null,
    unitPriceHistory: [],
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...rest,
  }
}

describe('budget-utils', () => {
  // =========================================================================
  // getActiveFiscalMonths
  // =========================================================================
  describe('getActiveFiscalMonths', () => {
    it('メンバーA: startDate 2025-02-11, endDate null, FY2024（4月開始）→ 2ヶ月（2月, 3月）', () => {
      const result = getActiveFiscalMonths('2025-02-11', null, 2024, 4)
      expect(result).toEqual(['2025-02', '2025-03'])
    })

    it('メンバーA: startDate 2025-02-11, endDate null, FY2025（4月開始）→ 12ヶ月', () => {
      const result = getActiveFiscalMonths('2025-02-11', null, 2025, 4)
      expect(result).toEqual([
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
      ])
    })

    it('メンバーB: startDate 2025-05-11, endDate 2026-02-11, FY2025 → 10ヶ月（5月〜2月）', () => {
      const result = getActiveFiscalMonths('2025-05-11', '2026-02-11', 2025, 4)
      expect(result).toEqual([
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
      ])
    })

    it('メンバーB: startDate 2025-05-11, endDate 2026-02-11, FY2024 → 空（重複なし）', () => {
      const result = getActiveFiscalMonths('2025-05-11', '2026-02-11', 2024, 4)
      expect(result).toEqual([])
    })

    it('startDateがnullの場合は空配列を返す', () => {
      const result = getActiveFiscalMonths(null, null, 2025, 4)
      expect(result).toEqual([])
    })

    it('startMonth=1（1月始まり）の場合: FY2025 = 2025-01 ～ 2025-12', () => {
      const result = getActiveFiscalMonths('2024-06-01', null, 2025, 1)
      expect(result).toEqual([
        '2025-01',
        '2025-02',
        '2025-03',
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
      ])
    })

    it('startMonth=10（10月始まり）の場合: FY2025 = 2025-10 ～ 2026-09', () => {
      const result = getActiveFiscalMonths('2025-01-01', null, 2025, 10)
      expect(result).toEqual([
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
      ])
    })

    it('メンバーの在籍期間が年度の一部のみ重なる場合', () => {
      // startDate 2025-06-15, endDate 2025-09-20, FY2025（4月開始）
      const result = getActiveFiscalMonths('2025-06-15', '2025-09-20', 2025, 4)
      expect(result).toEqual(['2025-06', '2025-07', '2025-08', '2025-09'])
    })

    it('endDateがstartDateと同じ月の場合は1ヶ月', () => {
      const result = getActiveFiscalMonths('2025-06-01', '2025-06-30', 2025, 4)
      expect(result).toEqual(['2025-06'])
    })
  })

  // =========================================================================
  // getApplicableUnitPrice
  // =========================================================================
  describe('getApplicableUnitPrice', () => {
    it('単一エントリで対象月が一致する場合、その金額を返す', () => {
      const history: UnitPriceEntry[] = [
        { effectiveFrom: '2025-04', amount: 100 },
      ]
      expect(getApplicableUnitPrice(history, '2025-04')).toBe(100)
    })

    it('単一エントリで対象月が後の場合、その金額を返す', () => {
      const history: UnitPriceEntry[] = [
        { effectiveFrom: '2025-04', amount: 100 },
      ]
      expect(getApplicableUnitPrice(history, '2025-08')).toBe(100)
    })

    it('複数エントリの場合、直近の適用エントリを返す', () => {
      const history: UnitPriceEntry[] = [
        { effectiveFrom: '2025-02', amount: 100 },
        { effectiveFrom: '2025-05', amount: 110 },
        { effectiveFrom: '2025-10', amount: 120 },
      ]
      // 2025-04はeffectiveFrom 2025-02の価格
      expect(getApplicableUnitPrice(history, '2025-04')).toBe(100)
      // 2025-05はeffectiveFrom 2025-05の価格
      expect(getApplicableUnitPrice(history, '2025-05')).toBe(110)
      // 2025-09はeffectiveFrom 2025-05の価格
      expect(getApplicableUnitPrice(history, '2025-09')).toBe(110)
      // 2025-10はeffectiveFrom 2025-10の価格
      expect(getApplicableUnitPrice(history, '2025-10')).toBe(120)
      // 2026-03はeffectiveFrom 2025-10の価格
      expect(getApplicableUnitPrice(history, '2026-03')).toBe(120)
    })

    it('エントリが空の場合は0を返す', () => {
      expect(getApplicableUnitPrice([], '2025-04')).toBe(0)
    })

    it('対象月が全エントリより前の場合は0を返す', () => {
      const history: UnitPriceEntry[] = [
        { effectiveFrom: '2025-05', amount: 110 },
      ]
      expect(getApplicableUnitPrice(history, '2025-04')).toBe(0)
    })

    it('ソートされていないエントリでも正しく動作する', () => {
      const history: UnitPriceEntry[] = [
        { effectiveFrom: '2025-10', amount: 120 },
        { effectiveFrom: '2025-02', amount: 100 },
        { effectiveFrom: '2025-05', amount: 110 },
      ]
      expect(getApplicableUnitPrice(history, '2025-07')).toBe(110)
    })

    it('effectiveFromと対象月が完全一致する場合はその金額を返す', () => {
      const history: UnitPriceEntry[] = [
        { effectiveFrom: '2025-04', amount: 100 },
        { effectiveFrom: '2025-07', amount: 150 },
      ]
      expect(getApplicableUnitPrice(history, '2025-07')).toBe(150)
    })
  })

  // =========================================================================
  // calcRevenueBudget
  // =========================================================================
  describe('calcRevenueBudget', () => {
    it('仕様例: メンバーC FY2024 売上予算 = 200（100×2ヶ月）', () => {
      const memberC = createTestMember({
        startDate: '2025-02-11',
        endDate: null,
        unitPriceHistory: [
          { effectiveFrom: '2025-02', amount: 100 },
          { effectiveFrom: '2025-05', amount: 110 },
          { effectiveFrom: '2025-10', amount: 120 },
        ],
      })
      expect(calcRevenueBudget(memberC, 2024, 4)).toBe(200)
    })

    it('仕様例: メンバーC FY2025 売上予算 = 1370（100×1 + 110×5 + 120×6）', () => {
      const memberC = createTestMember({
        startDate: '2025-02-11',
        endDate: null,
        unitPriceHistory: [
          { effectiveFrom: '2025-02', amount: 100 },
          { effectiveFrom: '2025-05', amount: 110 },
          { effectiveFrom: '2025-10', amount: 120 },
        ],
      })
      expect(calcRevenueBudget(memberC, 2025, 4)).toBe(1370)
    })

    it('unitPriceHistoryが空の場合は0を返す', () => {
      const member = createTestMember({
        startDate: '2025-04-01',
        unitPriceHistory: [],
      })
      expect(calcRevenueBudget(member, 2025, 4)).toBe(0)
    })

    it('アクティブ月がない場合は0を返す', () => {
      const member = createTestMember({
        startDate: '2026-04-01',
        unitPriceHistory: [{ effectiveFrom: '2026-04', amount: 100 }],
      })
      // FY2024にはアクティブ月なし
      expect(calcRevenueBudget(member, 2024, 4)).toBe(0)
    })

    it('startDateがnullの場合は0を返す', () => {
      const member = createTestMember({
        startDate: null,
        unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 100 }],
      })
      expect(calcRevenueBudget(member, 2025, 4)).toBe(0)
    })
  })

  // =========================================================================
  // calcExpectedRevenue
  // =========================================================================
  describe('calcExpectedRevenue', () => {
    const memberC = createTestMember({
      id: 'member-c',
      startDate: '2025-02-11',
      endDate: null,
      unitPriceHistory: [
        { effectiveFrom: '2025-02', amount: 100 },
        { effectiveFrom: '2025-05', amount: 110 },
        { effectiveFrom: '2025-10', amount: 120 },
      ],
    })

    it('アサイン率1.0の場合、売上予算と同額（FY2025 = 1370）', () => {
      const getMemberMonthlyTotal = (_memberId: string, _monthKey: string) =>
        1.0
      expect(calcExpectedRevenue(memberC, getMemberMonthlyTotal, 2025, 4)).toBe(
        1370,
      )
    })

    it('アサイン率0.5の場合、売上予算の半額（FY2025 = 685）', () => {
      const getMemberMonthlyTotal = (_memberId: string, _monthKey: string) =>
        0.5
      expect(calcExpectedRevenue(memberC, getMemberMonthlyTotal, 2025, 4)).toBe(
        685,
      )
    })

    it('アサイン率0の場合、0を返す', () => {
      const getMemberMonthlyTotal = (_memberId: string, _monthKey: string) =>
        0.0
      expect(calcExpectedRevenue(memberC, getMemberMonthlyTotal, 2025, 4)).toBe(
        0,
      )
    })

    it('月ごとにアサイン率が異なる場合', () => {
      // FY2024: 2月(100), 3月(100) のメンバーC
      // 2月: rate=0.5 → 50, 3月: rate=1.0 → 100 = 合計150
      const getMemberMonthlyTotal = (
        _memberId: string,
        monthKey: string,
      ): number => {
        if (monthKey === '2025-02') return 0.5
        if (monthKey === '2025-03') return 1.0
        return 0
      }
      expect(calcExpectedRevenue(memberC, getMemberMonthlyTotal, 2024, 4)).toBe(
        150,
      )
    })

    it('startDateがnullの場合は0を返す', () => {
      const member = createTestMember({
        startDate: null,
        unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 100 }],
      })
      const getMemberMonthlyTotal = () => 1.0
      expect(calcExpectedRevenue(member, getMemberMonthlyTotal, 2025, 4)).toBe(
        0,
      )
    })

    it('正しいmemberIdがコールバックに渡される', () => {
      const calls: string[] = []
      const getMemberMonthlyTotal = (
        memberId: string,
        _monthKey: string,
      ): number => {
        calls.push(memberId)
        return 1.0
      }
      calcExpectedRevenue(memberC, getMemberMonthlyTotal, 2024, 4)
      // FY2024でメンバーCは2ヶ月アクティブ
      expect(calls).toHaveLength(2)
      expect(calls.every((id) => id === 'member-c')).toBe(true)
    })
  })

  // =========================================================================
  // calcSectionBudget / calcSectionExpectedRevenue
  // =========================================================================
  describe('calcSectionBudget', () => {
    it('複数メンバーの売上予算を合算する', () => {
      const members: Member[] = [
        createTestMember({
          id: 'member-1',
          startDate: '2025-04-01',
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 100 }],
        }),
        createTestMember({
          id: 'member-2',
          startDate: '2025-04-01',
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 80 }],
        }),
      ]
      // member-1: 100×12 = 1200, member-2: 80×12 = 960 → 2160
      expect(calcSectionBudget(members, 2025, 4)).toBe(2160)
    })

    it('メンバーが空の場合は0を返す', () => {
      expect(calcSectionBudget([], 2025, 4)).toBe(0)
    })
  })

  describe('calcSectionExpectedRevenue', () => {
    it('複数メンバーの見込売上を合算する', () => {
      const members: Member[] = [
        createTestMember({
          id: 'member-1',
          startDate: '2025-04-01',
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 100 }],
        }),
        createTestMember({
          id: 'member-2',
          startDate: '2025-04-01',
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 80 }],
        }),
      ]
      const getMemberMonthlyTotal = () => 1.0
      // member-1: 100×12 = 1200, member-2: 80×12 = 960 → 2160
      expect(
        calcSectionExpectedRevenue(members, getMemberMonthlyTotal, 2025, 4),
      ).toBe(2160)
    })

    it('メンバーが空の場合は0を返す', () => {
      const getMemberMonthlyTotal = () => 1.0
      expect(
        calcSectionExpectedRevenue([], getMemberMonthlyTotal, 2025, 4),
      ).toBe(0)
    })
  })

  // =========================================================================
  // calcDivisionBudget / calcDivisionExpectedRevenue
  // =========================================================================
  describe('calcDivisionBudget', () => {
    it('部門配下の全課のメンバーの売上予算を合算する', () => {
      const sections: Section[] = [
        {
          id: 'section-1',
          divisionId: 'div-1',
          name: '第1課',
          sortOrder: 0,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 'section-2',
          divisionId: 'div-1',
          name: '第2課',
          sortOrder: 1,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ]
      const allMembers: Member[] = [
        createTestMember({
          id: 'member-1',
          sectionId: 'section-1',
          startDate: '2025-04-01',
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 100 }],
        }),
        createTestMember({
          id: 'member-2',
          sectionId: 'section-2',
          startDate: '2025-04-01',
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 80 }],
        }),
        // 別部門のメンバー（含めない）
        createTestMember({
          id: 'member-3',
          sectionId: 'section-other',
          startDate: '2025-04-01',
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 200 }],
        }),
      ]
      // section-1: 100×12=1200, section-2: 80×12=960 → 2160
      expect(calcDivisionBudget(sections, allMembers, 2025, 4)).toBe(2160)
    })

    it('課が空の場合は0を返す', () => {
      expect(calcDivisionBudget([], [], 2025, 4)).toBe(0)
    })
  })

  describe('calcDivisionExpectedRevenue', () => {
    it('部門配下の全課のメンバーの見込売上を合算する', () => {
      const sections: Section[] = [
        {
          id: 'section-1',
          divisionId: 'div-1',
          name: '第1課',
          sortOrder: 0,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ]
      const allMembers: Member[] = [
        createTestMember({
          id: 'member-1',
          sectionId: 'section-1',
          startDate: '2025-04-01',
          unitPriceHistory: [{ effectiveFrom: '2025-04', amount: 100 }],
        }),
      ]
      const getMemberMonthlyTotal = () => 0.5
      // member-1: 100×0.5×12 = 600
      expect(
        calcDivisionExpectedRevenue(
          sections,
          allMembers,
          getMemberMonthlyTotal,
          2025,
          4,
        ),
      ).toBe(600)
    })

    it('課が空の場合は0を返す', () => {
      const getMemberMonthlyTotal = () => 1.0
      expect(
        calcDivisionExpectedRevenue([], [], getMemberMonthlyTotal, 2025, 4),
      ).toBe(0)
    })
  })
})
