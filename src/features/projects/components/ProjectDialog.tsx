import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  type ProjectFormValues,
  projectFormSchema,
} from '@/infrastructure/validation/schemas'
import { Button } from '@/shared/components/ui/button'
import { Combobox } from '@/shared/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useToast } from '@/shared/hooks/use-toast'
import type { Project, ProjectLevel } from '@/shared/types'
import {
  CONFIDENCE_OPTIONS,
  PROJECT_LEVEL_LABELS,
  STATUS_OPTIONS,
} from '@/shared/types/project'
import { useProjectsStore } from '@/stores'
import { generateProjectCode } from '../utils/code-generator'

interface ProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  parentProject?: Project | null
  defaultLevel?: ProjectLevel
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  parentProject,
  defaultLevel = 0,
}: ProjectDialogProps) {
  const { toast } = useToast()
  const projects = useProjectsStore((state) => state.projects)
  const addProject = useProjectsStore((state) => state.addProject)
  const updateProject = useProjectsStore((state) => state.updateProject)

  const isEditing = !!project

  const level = useMemo(() => {
    if (project) return project.level
    return defaultLevel
  }, [project, defaultLevel])

  const autoCode = useMemo(() => {
    if (project) return project.code
    const parentCode = parentProject?.code
    return generateProjectCode(
      level,
      projects,
      parentProject?.id ?? null,
      parentCode,
    )
  }, [project, level, projects, parentProject])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      code: autoCode,
      name: project?.name ?? '',
      description: project?.description ?? '',
      background: project?.background ?? '',
      purpose: project?.purpose ?? '',
      parentId: project?.parentId ?? parentProject?.id ?? null,
      level,
      status: project?.status ?? 'not_started',
      confidence: project?.confidence ?? null,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: autoCode,
        name: project?.name ?? '',
        description: project?.description ?? '',
        background: project?.background ?? '',
        purpose: project?.purpose ?? '',
        parentId: project?.parentId ?? parentProject?.id ?? null,
        level,
        status: project?.status ?? 'not_started',
        confidence: project?.confidence ?? null,
      })
    }
  }, [open, autoCode, project, parentProject, level, reset])

  const onSubmit = useCallback(
    (data: ProjectFormValues) => {
      if (isEditing && project) {
        updateProject({ id: project.id, ...data })
        toast({ title: 'プロジェクトを更新しました' })
      } else {
        addProject(data)
        toast({ title: 'プロジェクトを追加しました' })
      }
      onOpenChange(false)
    },
    [isEditing, project, addProject, updateProject, onOpenChange, toast],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `${level > 0 ? 'タスク' : 'プロジェクト'}を編集`
              : level > 0
                ? '新規タスク'
                : '新規プロジェクト'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `${level > 0 ? 'タスク' : 'プロジェクト'}の情報を編集します。`
              : `${PROJECT_LEVEL_LABELS[level]}を追加します。`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">プロジェクトコード</Label>
              <Input
                id="code"
                {...register('code')}
                disabled={!isEditing}
                className="font-mono"
              />
              {errors.code ? (
                <p className="text-sm text-destructive">
                  {errors.code.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>レベル</Label>
              <Select
                value={String(level)}
                onValueChange={(v) => setValue('level', Number(v))}
                disabled
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      {PROJECT_LEVEL_LABELS[l] ?? `レベル${l}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              {level > 0 ? 'タスク名' : 'プロジェクト名'}
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder={
                level > 0 ? 'タスク名を入力' : 'プロジェクト名を入力'
              }
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            ) : null}
          </div>

          <div className={level > 0 ? '' : 'grid grid-cols-2 gap-4'}>
            <div className="space-y-2">
              <Label>ステータス</Label>
              <Combobox
                value={watch('status')}
                onValueChange={(v) =>
                  setValue(
                    'status',
                    v as 'not_started' | 'active' | 'completed',
                  )
                }
                options={STATUS_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                searchPlaceholder="ステータスを検索..."
              />
            </div>

            {level === 0 && (
              <div className="space-y-2">
                <Label>案件確度</Label>
                <Combobox
                  value={watch('confidence') ?? '__null__'}
                  onValueChange={(v) =>
                    setValue(
                      'confidence',
                      v === '__null__' ? null : (v as 'S' | 'A' | 'B' | 'C'),
                    )
                  }
                  options={[
                    { value: '__null__', label: '未設定' },
                    ...CONFIDENCE_OPTIONS.map((opt) => ({
                      value: opt.value,
                      label: `${opt.label}（${opt.description}）`,
                    })),
                  ]}
                  searchPlaceholder="確度を検索..."
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="background">背景</Label>
            <textarea
              id="background"
              {...register('background')}
              placeholder="プロジェクトの背景を入力"
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.background ? (
              <p className="text-sm text-destructive">
                {errors.background.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">目的</Label>
            <textarea
              id="purpose"
              {...register('purpose')}
              placeholder="プロジェクトの目的を入力"
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.purpose ? (
              <p className="text-sm text-destructive">
                {errors.purpose.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">説明</Label>
            <textarea
              id="description"
              {...register('description')}
              placeholder="プロジェクトの説明を入力"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.description ? (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          {parentProject ? (
            <div className="space-y-2">
              <Label>親プロジェクト</Label>
              <Input
                value={`${parentProject.code} - ${parentProject.name}`}
                disabled
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit">{isEditing ? '更新' : '追加'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
