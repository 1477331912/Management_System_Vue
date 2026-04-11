// 登录相关接口与本地登录态（员工信息）读写。
import { setToken } from './request'

const USER_KEY = 'user'

/**
 * 员工登录（POST /login）
 * 成功后将 token 与员工基本信息写入本地存储。
 */
export async function login(username, password) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  if (!response.ok) {
    throw new Error(`登录失败：HTTP ${response.status}`)
  }

  const result = await response.json()
  if (result.code !== 1) {
    throw new Error(result.msg || '登录失败')
  }

  const data = result.data
  if (!data?.token) {
    throw new Error('登录响应缺少 token')
  }

  setToken(data.token)
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      id: data.id,
      username: data.username,
      name: data.name
    })
  )

  return data
}

/** 读取本地缓存的员工信息（用于顶部栏展示姓名等）。 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** 退出登录时清除本地 token 与用户信息。 */
export function logout() {
  localStorage.removeItem(USER_KEY)
  setToken('')
}
