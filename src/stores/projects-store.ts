import { create } from 'zustand'
import { jsonStorage } from '@/infrastructure/storage'
import type {
  CreateProject,
  Project,
  ProjectTreeNode,
  UpdateProject,
} from '@/shared/types'
import { migrateProjectLevel } from '@/shared/types/project'

interface ProjectsState {
  projects: Project[]
  // Actions
  loadProjects: () => void
  addProject: (data: CreateProject) => Project
  updateProject: (data: UpdateProject) => void
  updateProjectsBatch: (updates: UpdateProject[]) => void
  deleteProject: (id: string) => void
  // Selectors
  getProjectById: (id: string) => Project | undefined
  getProjectsByLevel: (level: Project['level']) => Project[]
  getProjectsByParentId: (parentId: string | null) => Project[]
  getProjectTree: () => ProjectTreeNode[]
}

/**
 * 案件をツリー構造に変換
 */
function buildProjectTree(projects: Project[]): ProjectTreeNode[] {
  const nodeMap = new Map<string, ProjectTreeNode>()

  // まず全ノードを作成
  for (const project of projects) {
    nodeMap.set(project.id, {
      ...project,
      children: [],
      depth: typeof project.level === 'number' ? project.level : 0,
    })
  }

  // 親子関係を構築
  const roots: ProjectTreeNode[] = []
  for (const project of projects) {
    const node = nodeMap.get(project.id)
    if (!node) continue

    if (project.parentId) {
      const parent = nodeMap.get(project.parentId)
      if (parent) {
        parent.children.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  // 各レベルをコードでソート
  const sortNodes = (nodes: ProjectTreeNode[]) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code))
    for (const node of nodes) {
      sortNodes(node.children)
    }
  }
  sortNodes(roots)

  return roots
}

export const useProjectsStore = create<ProjectsState>()((set, get) => ({
  projects: [],

  loadProjects: () => {
    const db = jsonStorage.load()
    // マイグレーション: 旧文字列レベルを数値に変換
    const migrated = db.projects.map((p) => ({
      ...p,
      level: migrateProjectLevel(p.level as string | number),
    }))
    set({ projects: migrated })
  },

  addProject: (data) => {
    const now = new Date().toISOString()
    const newProject: Project = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    set((state) => {
      const newProjects = [...state.projects, newProject]
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, projects: newProjects })
      return { projects: newProjects }
    })

    return newProject
  },

  updateProject: (data) => {
    set((state) => {
      const newProjects = state.projects.map((p) =>
        p.id === data.id
          ? { ...p, ...data, updatedAt: new Date().toISOString() }
          : p,
      )
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, projects: newProjects })
      return { projects: newProjects }
    })
  },

  updateProjectsBatch: (updates) => {
    set((state) => {
      const now = new Date().toISOString()
      const updateMap = new Map(updates.map((u) => [u.id, u]))
      const newProjects = state.projects.map((p) => {
        const u = updateMap.get(p.id)
        return u ? { ...p, ...u, updatedAt: now } : p
      })
      const db = jsonStorage.load()
      jsonStorage.save({ ...db, projects: newProjects })
      return { projects: newProjects }
    })
  },

  deleteProject: (id) => {
    set((state) => {
      // 子案件も一緒に削除
      const idsToDelete = new Set<string>([id])
      let changed = true
      while (changed) {
        changed = false
        for (const p of state.projects) {
          if (
            p.parentId &&
            idsToDelete.has(p.parentId) &&
            !idsToDelete.has(p.id)
          ) {
            idsToDelete.add(p.id)
            changed = true
          }
        }
      }

      const newProjects = state.projects.filter((p) => !idsToDelete.has(p.id))
      const db = jsonStorage.load()
      jsonStorage.save({
        ...db,
        projects: newProjects,
      })
      return { projects: newProjects }
    })
  },

  getProjectById: (id) => {
    return get().projects.find((p) => p.id === id)
  },

  getProjectsByLevel: (level) => {
    return get().projects.filter((p) => p.level === level)
  },

  getProjectsByParentId: (parentId) => {
    return get().projects.filter((p) => p.parentId === parentId)
  },

  getProjectTree: () => {
    return buildProjectTree(get().projects)
  },
}))
