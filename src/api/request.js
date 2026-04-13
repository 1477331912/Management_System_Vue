// 统一 HTTP 请求封装：
// 登录成功后，后续接口在请求头中携带 token（与后端约定字段名为 token）。
const API_PREFIX = '/api'

const TOKEN_KEY = 'token'

/** 读取本地保存的 JWT。 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

/** 保存 JWT（登录成功后调用）。 */
export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/** 清除登录态（401 或未登录时使用）。 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/**
 * 底层请求：解析 JSON，401 与 HTTP 错误时抛错；不校验业务 code。
 * @param {string} url 相对路径
 * @param {RequestInit} options fetch 选项
 * @returns {Promise<{ code: number, msg?: string, data?: unknown }>}
 */
export async function apiRequestResult(url, options = {}) {
  const headers = { ...(options.headers || {}) }
  const token = getToken()
  if (token) {
    headers.token = token
  }
  const isFormData = options.body instanceof FormData
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_PREFIX}${url}`, {
    ...options,
    headers
  })

  if (response.status === 401) {
    clearToken()
    localStorage.removeItem('user')
    if (!window.location.pathname.endsWith('/login')) {
      window.location.href = '/login'
    }
    throw new Error('登录已过期，请重新登录')
  }

  if (!response.ok) {
    throw new Error(`请求失败：HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * 发起业务请求（自动附加 token、统一解析 JSON）。
 * code !== 1 时抛错（适用于绝大多数接口）。
 */
export async function apiRequest(url, options = {}) {
  const result = await apiRequestResult(url, options)
  if (result.code !== 1) {
    throw new Error(result.msg || '接口返回失败')
  }
  return result
}
