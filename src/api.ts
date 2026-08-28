// SPEC v2.0: клиент только отображает, бэкенд — единственный источник истины.
import axios from 'axios'
import { User, Generation, Catalog } from './types'

export const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// === Аналитика (SPEC §15): fire-and-forget, не блокирует UI ===
export const logEvent = (userId: number | undefined, event: string, payload?: object) => {
  api.post('/api/event', { user_id: userId, event, payload }).catch(() => {})
}

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

export const getCatalog = async (): Promise<Catalog> => {
  const response = await api.get('/api/catalog')
  return response.data
}

export const uploadPhoto = async (userId: number, file: File): Promise<{ file_id: string; phash: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('user_id', userId.toString())
  const response = await api.post('/api/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return { file_id: response.data.file_id, phash: response.data.phash || '' }
}

// Курс кредитов (SPEC §4.2) — отображение; истина на сервере
export const COST_LOW = 1
export const COST_MEDIUM = 5
export const COST_HD = 15
export const COST_VARIATIONS = 10
// совместимость со старыми экранами
export const DESIGN_COST = COST_MEDIUM
export const HD_COST = COST_HD
export const VARIATIONS_COST = COST_VARIATIONS

export const generateDesign = async (params: {
  user_id: number
  file_id: string
  style_id: string
  job_id?: string
  room_type?: string
  palette_id?: string
  quality?: 'low' | 'medium'
  phash?: string
}): Promise<{
  task_id: string | null
  cached: boolean
  generation_id?: number
  result_url?: string
  preview_url?: string
  charge: 'free_daily' | 'quota' | 'paid'
  quality: 'low' | 'medium'
  cost: number
  credits_paid_left: number
  credits_free_daily_left: number
  credits_left: number
  free_left: number
  daily_free_left: number
  stars_left: number
}> => {
  const response = await api.post('/api/generate', params)
  return response.data
}

export const generateExample = async (params: {
  user_id: number
  example_id: string
  style_id?: string
}): Promise<{ task_id: string; charge: 'example'; quality: 'medium'; cost: number }> => {
  const response = await api.post('/api/generate-example', params)
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

export const shareResult = async (userId: number, generationId: number): Promise<{
  ok: boolean; collage_url: string
}> => {
  const response = await api.post(`/api/share/${generationId}`, { user_id: userId })
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

// === Оплата (SPEC §12.2): номиналы Telegram 50/150/150/350 ===
export type PackId = 'pack_s' | 'pack_m' | 'sub_pro' | 'sub_premium'

export interface PackInfo {
  credits: number
  price: number
  title: string
  desc: string
  badge: string | null
  kind: 'pack' | 'sub'
  saving?: string | null
  quota?: { medium: number; low: number; hd: number }
}

export const PACKS: Record<PackId, PackInfo> = {
  pack_s: { credits: 50, price: 50, title: 'S · 50 кредитов', desc: '10 дизайнов Medium', badge: null, kind: 'pack' },
  pack_m: { credits: 180, price: 150, title: 'M · 180 кредитов', desc: '36 дизайнов Medium', badge: 'Выгодно', kind: 'pack', saving: 'Экономия 20%' },
  sub_pro: { credits: 0, price: 150, title: 'PRO · 150 ⭐/мес', desc: '40 Medium + 200 черновиков Low', badge: 'Популярный', kind: 'sub', quota: { medium: 40, low: 200, hd: 0 } },
  sub_premium: { credits: 0, price: 350, title: 'PREMIUM · 350 ⭐/мес', desc: '20 HD + 60 Medium + 300 Low', badge: 'Максимум', kind: 'sub', saving: 'Дизайн дешевле, чем в PRO', quota: { medium: 60, low: 300, hd: 20 } },
}

export const PACK_ORDER: PackId[] = ['pack_s', 'pack_m', 'sub_pro', 'sub_premium']

export const buyPack = async (userId: number, pack: PackId): Promise<{ invoice_url: string }> => {
  const response = await api.post('/api/buy', { user_id: userId, pack })
  return response.data
}
