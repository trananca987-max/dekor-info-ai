import axios from 'axios'
import { User, Generation } from './types'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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

export const DESIGN_COST = 5
export const HD_COST = 15
export const VARIATIONS_COST = 10

export const generateDesign = async (params: {
  user_id: number
  file_id: string
  style_id: string
  mode?: GenMode
}): Promise<{ task_id: string; charge: 'free' | 'stars'; stars_left: number; free_left: number }> => {
  const response = await api.post('/api/generate', params)
  return response.data
}

export const enhanceHd = async (userId: number, generationId: number): Promise<{
  task_id: string; cost: number; stars_left: number
}> => {
  const response = await api.post(`/api/enhance-hd/${generationId}`, { user_id: userId })
  return response.data
}

export const makeVariations = async (userId: number, generationId: number): Promise<{
  task_ids: string[]; cost: number; stars_left: number
}> => {
  const response = await api.post(`/api/variations/${generationId}`, { user_id: userId })
  return response.data
}

export const claimBonus = async (userId: number, action: 'invite_friend' | 'subscribe_channel' | 'return_week'): Promise<{
  ok: boolean; reward: number; stars_left: number
}> => {
  const response = await api.post('/api/bonus', { user_id: userId, action })
  return response.data
}

export const checkGenerationStatus = async (taskId: string): Promise<{
  status: 'processing' | 'completed' | 'failed'
  result_url?: string
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

// === Оплата (Telegram Stars): пакеты звёзд ===

export type PackId = 'stars50' | 'stars150' | 'sub300'

export const PACKS: Record<PackId, { title: string; desc: string; price: number }> = {
  stars50: { title: '50 звёзд', desc: 'Попробовать: ~10 дизайнов', price: 50 },
  stars150: { title: '150 звёзд −20%', desc: '~30 дизайнов, лучшая цена', price: 120 },
  sub300: { title: 'Подписка 300★/мес', desc: '60 дизайнов + приоритет, не сгорает', price: 250 },
}

export const buyPack = async (userId: number, pack: PackId): Promise<{
  invoice_url: string
}> => {
  const response = await api.post('/api/buy', { user_id: userId, pack })
  return response.data
}
