// 客户管理接口（与后端 /customers 约定一致）。
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

/** 分页条件查询 GET /customers */
export async function getCustomerPage(params) {
  const query = toQuery(params)
  const result = await apiRequest(`/customers${query ? `?${query}` : ''}`, { method: 'GET' })
  return result.data || { total: 0, rows: [] }
}

/** 详情（含宠物列表）GET /customers/{id} */
export async function getCustomerDetail(id) {
  const result = await apiRequest(`/customers/${id}`, { method: 'GET' })
  return result.data || null
}

/** 新增 POST /customers */
export async function createCustomer(payload) {
  await apiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

/** 修改 PUT /customers */
export async function updateCustomer(payload) {
  await apiRequest('/customers', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

/** 删除 DELETE /customers/{id} */
export async function deleteCustomer(id) {
  await apiRequest(`/customers/${id}`, { method: 'DELETE' })
}
