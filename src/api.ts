import axios from 'axios'
import { User, Generation } from './types'

// В продакшене фронт раздаёт тот же бэкенд → пустой baseURL = same-origin запросы
export const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const checkSubscription = async (userId: number): Promise<boolean> => {
  const response = await api.post('/api/check-subscription', { user_id: userId })
  return response.data.is_subscribed
}

export const getUser = async (userId: number): Promise<User> => {
  const response = await api.get(`/api/users/${userId}`)
  return response.data
}

export const createUser = async (userData: {
  telegram_id: number
  username?: string
  first_name: string
  ref?: string
}): Promise<User> => {
  const response = await api.post('/api/users', userData)
  return response.data
}

export const uploadPhoto = async (userId: number, file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', userId.toString())
  
  const response = await api.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data.file_id
}

export type GenMode = 'style' | 'empty' | 'furnish'

// SPEC 4/5: стоимость в КРЕДИТАХ
export const DESIGN_COST = 5
export const HD_COST = 15
export const VARIATIONS_COST = 10

export const generateDesign = async (params: {
  user_id: number
  file_id: string
  style_id: string
  mode?: GenMode
}): Promise<{
  task_id: string
  charge: 'free' | 'free_draft' | 'quota' | 'credits'
  quality: 'low' | 'medium'
  credits_left: number
  free_left: number
  daily_free_left: number
  stars_left: number  // legacy-совместимость
}> => {
  const response = await api.post('/api/generate', params)
  return response.data
}

export const enhanceHd = async (userId: number, generationId: number): Promise<{
  task_id: string; cost: number; credits_left: number; stars_left: number
}> => {
  const response = await api.post(`/api/enhance-hd/${generationId}`, { user_id: userId })
  return response.data
}

export const makeVariations = async (userId: number, generationId: number): Promise<{
  task_ids: string[]; cost: number; credits_left: number; stars_left: number
}> => {
  const response = await api.post(`/api/variations/${generationId}`, { user_id: userId })
  return response.data
}

export const claimBonus = async (userId: number, action: 'invite_friend' | 'subscribe_channel'): Promise<{
  ok: boolean; reward: number; credits_left: number
}> => {
  const response = await api.post('/api/bonus', { user_id: userId, action })
  return response.data
}

export const checkGenerationStatus = async (taskId: string): Promise<{
  status: 'processing' | 'completed' | 'failed'
  result_url?: string
  preview_url?: string
  error?: string
  progress?: number
}> => {
  const response = await api.get(`/api/generate/${taskId}`)
  return response.data
}

export const getUserGenerations = async (userId: number): Promise<Generation[]> => {
  const response = await api.get(`/api/users/${userId}/generations`)
  return response.data
}

// === Оплата (SPEC 4): ⭐ — внешняя валюта, кредиты — внутренняя ===

export type PackId = 'pack_s' | 'pack_m' | 'sub_pro' | 'sub_premium'

export interface PackInfo {
  credits: number
  price: number
  title: string
  desc: string
  badge: string | null
  kind: 'pack' | 'sub'
  quota?: { medium: number; low: number; hd: number }
}

export const PACKS: Record<PackId, PackInfo> = {
  pack_s: { credits: 60, price: 60, title: '60 кредитов', desc: '12 дизайнов Medium', badge: null, kind: 'pack' },
  pack_m: { credits: 200, price: 160, title: '200 кредитов −20%', desc: '40 дизайнов Medium', badge: 'Выгодно', kind: 'pack' },
  sub_pro: { credits: 0, price: 149, title: 'PRO · 149 ⭐/мес', desc: '40 Medium + 200 черновиков Low', badge: 'Популярный', kind: 'sub', quota: { medium: 40, low: 200, hd: 0 } },
  sub_premium: { credits: 0, price: 299, title: 'PREMIUM · 299 ⭐/мес', desc: '20 HD + 50 Medium + 250 Low', badge: 'Лучшая цена за дизайн', kind: 'sub', quota: { medium: 50, low: 250, hd: 20 } },
}

export const PACK_ORDER: PackId[] = ['pack_s', 'pack_m', 'sub_pro', 'sub_premium']

export const buyPack = async (userId: number, pack: PackId): Promise<{
  invoice_url: string
}> => {
  const response = await api.post('/api/buy', { user_id: userId, pack })
  return response.data
}
