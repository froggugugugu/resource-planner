import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Project } from '@/shared/types'
import { ProjectDialog } from '../ProjectDialog'

// モックストア
vi.mock('@/stores', () => ({
  useProjectsStore: (selector: (state: any) => any) => {
    const state = {
      projects: [],
      addProject: vi.fn(),
      updateProject: vi.fn(),
    }
    return selector(state)
  },
}))

// モックトースト
vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

const mockParentProject: Project = {
  id: 'parent-1',
  code: 'P001',
  name: '親プロジェクト',
  description: '',
  background: '',
  purpose: '',
  parentId: null,
  level: 0,
  status: 'active',
  confidence: 'S',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('ProjectDialog', () => {
  describe('ダイアログタイトル', () => {
    it('level=0（プロジェクト）の場合、新規時は「新規プロジェクト」を表示', () => {
      render(
        <ProjectDialog open={true} onOpenChange={vi.fn()} defaultLevel={0} />,
      )

      expect(screen.getByText('新規プロジェクト')).toBeInTheDocument()
    })

    it('level>0（タスク）の場合、新規時は「新規タスク」を表示', () => {
      render(
        <ProjectDialog
          open={true}
          onOpenChange={vi.fn()}
          defaultLevel={1}
          parentProject={mockParentProject}
        />,
      )

      expect(screen.getByText('新規タスク')).toBeInTheDocument()
    })

    it('level=0の編集時は「プロジェクトを編集」を表示', () => {
      const project: Project = {
        ...mockParentProject,
        id: 'proj-1',
        level: 0,
      }

      render(
        <ProjectDialog open={true} onOpenChange={vi.fn()} project={project} />,
      )

      expect(screen.getByText('プロジェクトを編集')).toBeInTheDocument()
    })

    it('level>0の編集時は「タスクを編集」を表示', () => {
      const task: Project = {
        ...mockParentProject,
        id: 'task-1',
        code: 'P001-01',
        name: 'タスク1',
        parentId: 'parent-1',
        level: 1,
      }

      render(
        <ProjectDialog open={true} onOpenChange={vi.fn()} project={task} />,
      )

      expect(screen.getByText('タスクを編集')).toBeInTheDocument()
    })
  })

  describe('プロジェクト名/タスク名ラベル', () => {
    it('level=0の場合、ラベルは「プロジェクト名」', () => {
      render(
        <ProjectDialog open={true} onOpenChange={vi.fn()} defaultLevel={0} />,
      )

      expect(screen.getByLabelText('プロジェクト名')).toBeInTheDocument()
    })

    it('level>0の場合、ラベルは「タスク名」', () => {
      render(
        <ProjectDialog
          open={true}
          onOpenChange={vi.fn()}
          defaultLevel={1}
          parentProject={mockParentProject}
        />,
      )

      expect(screen.getByLabelText('タスク名')).toBeInTheDocument()
    })
  })

  describe('案件確度フィールド', () => {
    it('level=0の場合、案件確度フィールドが表示される', () => {
      render(
        <ProjectDialog open={true} onOpenChange={vi.fn()} defaultLevel={0} />,
      )

      expect(screen.getByText('案件確度')).toBeInTheDocument()
    })

    it('level>0の場合、案件確度フィールドが非表示', () => {
      render(
        <ProjectDialog
          open={true}
          onOpenChange={vi.fn()}
          defaultLevel={1}
          parentProject={mockParentProject}
        />,
      )

      expect(screen.queryByText('案件確度')).not.toBeInTheDocument()
    })

    it('level=2の場合も、案件確度フィールドが非表示', () => {
      render(
        <ProjectDialog
          open={true}
          onOpenChange={vi.fn()}
          defaultLevel={2}
          parentProject={mockParentProject}
        />,
      )

      expect(screen.queryByText('案件確度')).not.toBeInTheDocument()
    })
  })

  describe('ステータスフィールド', () => {
    it('level=0でもlevel>0でも、ステータスフィールドは常に表示される', () => {
      const { rerender } = render(
        <ProjectDialog open={true} onOpenChange={vi.fn()} defaultLevel={0} />,
      )

      expect(screen.getByText('ステータス')).toBeInTheDocument()

      rerender(
        <ProjectDialog
          open={true}
          onOpenChange={vi.fn()}
          defaultLevel={1}
          parentProject={mockParentProject}
        />,
      )

      expect(screen.getByText('ステータス')).toBeInTheDocument()
    })
  })
})
