import { create } from 'zustand'
import { jsonStorage } from '@/infrastructure/storage'
import {
  CATEGORY_DEFAULT_COLORS,
  MASTER_DATA,
} from '@/shared/data/tech-tag-master'
import type {
  CreateTechTag,
  CreateTechTagCategory,
  CreateTechTagSubCategory,
  TechTag,
  TechTagCategory,
  TechTagSubCategory,
  UpdateTechTag,
  UpdateTechTagCategory,
  UpdateTechTagSubCategory,
} from '@/shared/types'

interface TechTagsState {
  techTags: TechTag[]
  techTagCategories: TechTagCategory[]
  techTagSubCategories: TechTagSubCategory[]

  // Lifecycle
  loadTechTags: () => void
  resetAll: () => void
  seedFromMaster: () => void

  // Tag CRUD
  addTechTag: (data: CreateTechTag) => TechTag
  updateTechTag: (data: UpdateTechTag) => void
  deleteTechTag: (id: string) => void
  getTechTagById: (id: string) => TechTag | undefined

  // Category CRUD
  addCategory: (data: CreateTechTagCategory) => TechTagCategory
  updateCategory: (data: UpdateTechTagCategory) => void
  deleteCategory: (id: string) => void

  // SubCategory CRUD
  addSubCategory: (data: CreateTechTagSubCategory) => TechTagSubCategory
  updateSubCategory: (data: UpdateTechTagSubCategory) => void
  deleteSubCategory: (id: string) => void
}

function persistToStorage(state: {
  techTags: TechTag[]
  techTagCategories: TechTagCategory[]
  techTagSubCategories: TechTagSubCategory[]
}) {
  const db = jsonStorage.load()
  jsonStorage.save({
    ...db,
    techTags: state.techTags,
    techTagCategories: state.techTagCategories,
    techTagSubCategories: state.techTagSubCategories,
  })
}

export const useTechTagsStore = create<TechTagsState>()((set, get) => ({
  techTags: [],
  techTagCategories: [],
  techTagSubCategories: [],

  loadTechTags: () => {
    const db = jsonStorage.load()
    const techTags = (db.techTags ?? []).map((t: TechTag) => ({
      ...t,
      categoryId: t.categoryId ?? '',
      subCategoryId: t.subCategoryId ?? null,
      note: t.note ?? null,
    }))
    set({
      techTags,
      techTagCategories: db.techTagCategories ?? [],
      techTagSubCategories: db.techTagSubCategories ?? [],
    })
  },

  resetAll: () => {
    set({
      techTags: [],
      techTagCategories: [],
      techTagSubCategories: [],
    })
  },

  seedFromMaster: () => {
    const state = get()
    if (state.techTagCategories.length > 0 || state.techTags.length > 0) {
      return
    }

    const now = new Date().toISOString()
    const categories: TechTagCategory[] = []
    const subCategories: TechTagSubCategory[] = []
    const tags: TechTag[] = []

    for (const [ci, masterCat] of MASTER_DATA.entries()) {
      const catId = crypto.randomUUID()
      categories.push({
        id: catId,
        name: masterCat.name,
        sortOrder: ci,
        createdAt: now,
        updatedAt: now,
      })

      const defaultColor = CATEGORY_DEFAULT_COLORS[masterCat.name] ?? '#6b7280'

      for (const [si, masterSub] of masterCat.subCategories.entries()) {
        const subId = crypto.randomUUID()
        subCategories.push({
          id: subId,
          categoryId: catId,
          name: masterSub.name,
          sortOrder: si,
          createdAt: now,
          updatedAt: now,
        })

        for (const masterTag of masterSub.tags) {
          tags.push({
            id: crypto.randomUUID(),
            name: masterTag.name,
            color: defaultColor,
            categoryId: catId,
            subCategoryId: subId,
            note: masterTag.note ?? null,
            createdAt: now,
            updatedAt: now,
          })
        }
      }
    }

    const newState = {
      techTags: tags,
      techTagCategories: categories,
      techTagSubCategories: subCategories,
    }
    set(newState)
    persistToStorage(newState)
  },

  // ── Tag CRUD ──

  addTechTag: (data) => {
    const now = new Date().toISOString()
    const newTag: TechTag = {
      ...data,
      id: crypto.randomUUID(),
      subCategoryId: data.subCategoryId ?? null,
      note: data.note ?? null,
      createdAt: now,
      updatedAt: now,
    }

    set((state) => {
      const newState = {
        ...state,
        techTags: [...state.techTags, newTag],
      }
      persistToStorage(newState)
      return { techTags: newState.techTags }
    })

    return newTag
  },

  updateTechTag: (data) => {
    set((state) => {
      const newTags = state.techTags.map((t) =>
        t.id === data.id
          ? { ...t, ...data, updatedAt: new Date().toISOString() }
          : t,
      )
      const newState = { ...state, techTags: newTags }
      persistToStorage(newState)
      return { techTags: newTags }
    })
  },

  deleteTechTag: (id) => {
    set((state) => {
      const newTags = state.techTags.filter((t) => t.id !== id)
      const newState = { ...state, techTags: newTags }
      persistToStorage(newState)
      return { techTags: newTags }
    })
  },

  getTechTagById: (id) => {
    return get().techTags.find((t) => t.id === id)
  },

  // ── Category CRUD ──

  addCategory: (data) => {
    const now = new Date().toISOString()
    const newCat: TechTagCategory = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    set((state) => {
      const newState = {
        ...state,
        techTagCategories: [...state.techTagCategories, newCat],
      }
      persistToStorage(newState)
      return { techTagCategories: newState.techTagCategories }
    })

    return newCat
  },

  updateCategory: (data) => {
    set((state) => {
      const newCats = state.techTagCategories.map((c) =>
        c.id === data.id
          ? { ...c, ...data, updatedAt: new Date().toISOString() }
          : c,
      )
      const newState = { ...state, techTagCategories: newCats }
      persistToStorage(newState)
      return { techTagCategories: newCats }
    })
  },

  deleteCategory: (id) => {
    set((state) => {
      const newState = {
        ...state,
        techTagCategories: state.techTagCategories.filter((c) => c.id !== id),
        techTagSubCategories: state.techTagSubCategories.filter(
          (s) => s.categoryId !== id,
        ),
        techTags: state.techTags.filter((t) => t.categoryId !== id),
      }
      persistToStorage(newState)
      return {
        techTagCategories: newState.techTagCategories,
        techTagSubCategories: newState.techTagSubCategories,
        techTags: newState.techTags,
      }
    })
  },

  // ── SubCategory CRUD ──

  addSubCategory: (data) => {
    const now = new Date().toISOString()
    const newSub: TechTagSubCategory = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    set((state) => {
      const newState = {
        ...state,
        techTagSubCategories: [...state.techTagSubCategories, newSub],
      }
      persistToStorage(newState)
      return { techTagSubCategories: newState.techTagSubCategories }
    })

    return newSub
  },

  updateSubCategory: (data) => {
    set((state) => {
      const newSubs = state.techTagSubCategories.map((s) =>
        s.id === data.id
          ? { ...s, ...data, updatedAt: new Date().toISOString() }
          : s,
      )
      const newState = { ...state, techTagSubCategories: newSubs }
      persistToStorage(newState)
      return { techTagSubCategories: newSubs }
    })
  },

  deleteSubCategory: (id) => {
    set((state) => {
      const newTags = state.techTags.map((t) =>
        t.subCategoryId === id ? { ...t, subCategoryId: null } : t,
      )
      const newState = {
        ...state,
        techTagSubCategories: state.techTagSubCategories.filter(
          (s) => s.id !== id,
        ),
        techTags: newTags,
      }
      persistToStorage(newState)
      return {
        techTagSubCategories: newState.techTagSubCategories,
        techTags: newState.techTags,
      }
    })
  },
}))
