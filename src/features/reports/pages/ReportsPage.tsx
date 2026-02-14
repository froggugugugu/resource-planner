import { useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { useMembersStore, useProjectsStore } from '@/stores'
import { DataExport } from '../components/DataExport'
import { SnapshotHistory } from '../components/SnapshotHistory'

export function ReportsPage() {
  const loadProjects = useProjectsStore((state) => state.loadProjects)
  const loadMembers = useMembersStore((state) => state.loadMembers)

  useEffect(() => {
    loadProjects()
    loadMembers()
  }, [loadProjects, loadMembers])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">データ管理</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>データエクスポート / インポート</CardTitle>
        </CardHeader>
        <CardContent>
          <DataExport />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>スナップショット履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <SnapshotHistory />
        </CardContent>
      </Card>
    </div>
  )
}
