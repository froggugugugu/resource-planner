import type { Member } from '@/shared/types/member'
import type { Section } from '@/shared/types/section'

/**
 * メンバーを部門・課でフィルタリング
 * selectedDivisionId: '' = フィルタなし, '__unaffiliated__' = 未所属, UUID = 部門ID
 * selectedSectionId: '' = 部門内全課, UUID = 特定の課
 */
export function filterMembersByOrganization(
  members: Member[],
  sections: Section[],
  selectedDivisionId: string,
  selectedSectionId: string,
): Member[] {
  if (!selectedDivisionId) return members

  if (selectedDivisionId === '__unaffiliated__') {
    return members.filter((m) => !m.sectionId)
  }

  if (selectedSectionId) {
    return members.filter((m) => m.sectionId === selectedSectionId)
  }

  const sectionIds = new Set(
    sections
      .filter((s) => s.divisionId === selectedDivisionId)
      .map((s) => s.id),
  )
  return members.filter(
    (m) => m.sectionId !== null && sectionIds.has(m.sectionId),
  )
}
