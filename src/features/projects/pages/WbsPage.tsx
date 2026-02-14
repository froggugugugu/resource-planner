import { Settings } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Combobox } from '@/shared/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { useToast } from '@/shared/hooks/use-toast'
import type { Project, ProjectLevel, ProjectTreeNode } from '@/shared/types'
import { useProjectsStore } from '@/stores'
import { ProjectDialog } from '../components/ProjectDialog'
import { ProjectTreeGrid } from '../components/ProjectTreeGrid'

export function WbsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const loadProjects = useProjectsStore((state) => state.loadProjects)
  const getProjectTree = useProjectsStore((state) => state.getProjectTree)
  const deleteProject = useProjectsStore((state) => state.deleteProject)
  const projects = useProjectsStore((state) => state.projects)

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () =>
      (location.state as { selectedProjectId?: string } | null)
        ?.selectedProjectId ?? '',
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [parentProject, setParentProject] = useState<Project | null>(null)
  const [defaultLevel, setDefaultLevel] = useState<ProjectLevel>(2)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const majorProjects = useMemo(
    () =>
      projects
        .filter((p) => p.level === 0)
        .sort((a, b) => a.code.localeCompare(b.code)),
    [projects],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: getProjectTree内部でprojectsを参照するため、projectsの変更をトリガーにする
  const fullTree = useMemo(() => getProjectTree(), [projects])

  const filteredTree = useMemo<ProjectTreeNode[]>(() => {
    if (!selectedProjectId) return []
    return fullTree.filter((node) => node.id === selectedProjectId)
  }, [fullTree, selectedProjectId])

  const handleAddChild = useCallback(
    (parent: Project, childLevel: ProjectLevel) => {
      setEditProject(null)
      setParentProject(parent)
      setDefaultLevel(childLevel)
      setDialogOpen(true)
    },
    [],
  )

  const handleEdit = useCallback((project: Project) => {
    setEditProject(project)
    setParentProject(null)
    setDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((project: Project) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id)
      toast({ title: 'WBS項目を削除しました' })
    }
    setDeleteDialogOpen(false)
    setProjectToDelete(null)
  }, [projectToDelete, deleteProject, toast])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">WBS</h1>
          <p className="text-sm text-muted-foreground">
            プロジェクトごとのWBS（作業分解構成）を編集します
          </p>
        </div>
        <Button
          data-tour="wbs-settings"
          variant="ghost"
          size="icon"
          disabled={!selectedProjectId}
          onClick={() => navigate(`/wbs-settings/${selectedProjectId}`)}
          title="WBS設定"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Project selector */}
      <div data-tour="wbs-project-selector" className="flex items-center gap-4">
        <span className="text-sm font-medium">対象プロジェクト</span>
        <Combobox
          value={selectedProjectId}
          onValueChange={setSelectedProjectId}
          options={majorProjects.map((p) => ({
            value: p.id,
            label: `${p.code} - ${p.name}（${p.confidence ?? '未設定'}）`,
          }))}
          placeholder="プロジェクトを選択してください"
          searchPlaceholder="プロジェクトを検索..."
          className="w-[480px]"
        />
      </div>

      <Card data-tour="wbs-grid">
        <CardHeader>
          <CardTitle>
            {selectedProjectId
              ? `WBS - ${majorProjects.find((p) => p.id === selectedProjectId)?.name ?? ''}`
              : 'WBS'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedProjectId ? (
            <p className="py-8 text-center text-muted-foreground">
              {majorProjects.length === 0
                ? 'プロジェクトがありません。先にプロジェクト画面からプロジェクトを登録してください。'
                : 'プロジェクトを選択してください。'}
            </p>
          ) : (
            <ProjectTreeGrid
              tree={filteredTree}
              projectId={selectedProjectId}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          )}
        </CardContent>
      </Card>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editProject}
        parentProject={parentProject}
        defaultLevel={defaultLevel}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>WBS項目の削除</DialogTitle>
            <DialogDescription>
              「{projectToDelete?.name}
              」を削除しますか？子項目と関連する配分データもすべて削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
