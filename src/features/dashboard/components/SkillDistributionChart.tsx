import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Member } from '@/shared/types/member'
import type { TechTag } from '@/shared/types/tech-tag'
import type { TechTagCategory } from '@/shared/types/tech-tag-category'
import { getSkillDistribution } from '../utils/dashboard-utils'

interface SkillDistributionChartProps {
  members: Member[]
  techTags: TechTag[]
  techTagCategories: TechTagCategory[]
}

export function SkillDistributionChart({
  members,
  techTags,
  techTagCategories,
}: SkillDistributionChartProps) {
  const chartData = useMemo(
    () => getSkillDistribution(members, techTags, techTagCategories),
    [members, techTags, techTagCategories],
  )

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        スキルデータがありません
      </div>
    )
  }

  const chartHeight = Math.max(300, chartData.length * 36 + 60)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          type="number"
          allowDecimals={false}
          className="text-xs"
          tick={{ fill: 'var(--color-muted-foreground)' }}
          label={{
            value: '人数',
            position: 'insideBottomRight',
            offset: -5,
            fill: 'var(--color-muted-foreground)',
          }}
        />
        <YAxis
          type="category"
          dataKey="categoryName"
          width={160}
          className="text-xs"
          tick={{ fill: 'var(--color-muted-foreground)' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-popover)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            color: 'var(--color-popover-foreground)',
          }}
          formatter={(value: number) => [`${value}人`, 'メンバー数']}
        />
        <Bar dataKey="memberCount" radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.categoryId} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
