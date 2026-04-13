// 服务项目管理接口（与后端 /service-items 约定一致）。
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

/** 分页条件查询 GET /service-items */
export async function getServiceItemPage(params) {
  const query = toQuery(params)
  const result = await apiRequest(`/service-items${query ? `?${query}` : ''}`, { method: 'GET' })
  return result.data || { total: 0, rows: [] }
}

/** 详情 GET /service-items/{id} */
export async function getServiceItemDetail(id) {
  const result = await apiRequest(`/service-items/${id}`, { method: 'GET' })
  return result.data || null
}

/** 新增 POST /service-items */
export async function createServiceItem(payload) {
  await apiRequest('/service-items', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/** 修改 PUT /service-items */
export async function updateServiceItem(payload) {
  await apiRequest('/service-items', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

/** 删除 DELETE /service-items/{id} */
export async function deleteServiceItem(id) {
  await apiRequest(`/service-items/${id}`, { method: 'DELETE' })
}
