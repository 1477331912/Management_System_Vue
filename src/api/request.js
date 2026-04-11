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
 * 发起业务请求（自动附加 token、统一解析 JSON）。
 * @param {string} url 相对路径，如 /depts
 * @param {RequestInit} options fetch 选项
 */
export async function apiRequest(url, options = {}) {
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

  const result = await response.json()
  if (result.code !== 1) {
    throw new Error(result.msg || '接口返回失败')
  }

  return result
}
