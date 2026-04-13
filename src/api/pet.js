// 宠物管理接口（与后端 /pets 约定一致）。
import { apiRequest } from './request'

function toQuery(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value))
    }
  })
  return search.toString()
}

/** 分页条件查询 GET /pets */
export async function getPetPage(params) {
  const query = toQuery(params)
  const result = await apiRequest(`/pets${query ? `?${query}` : ''}`, { method: 'GET' })
  return result.data || { total: 0, rows: [] }
}

/** 详情（含所属客户）GET /pets/{id} */
export async function getPetDetail(id) {
  const result = await apiRequest(`/pets/${id}`, { method: 'GET' })
  return result.data || null
}

/** 新增 POST /pets */
export async function createPet(payload) {
  await apiRequest('/pets', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/** 修改 PUT /pets */
export async function updatePet(payload) {
  await apiRequest('/pets', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

/** 删除 DELETE /pets/{id} */
export async function deletePet(id) {
  await apiRequest(`/pets/${id}`, { method: 'DELETE' })
}
