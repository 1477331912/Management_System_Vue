// 订单管理接口（与后端 /orders 约定一致）。
import { apiRequest, apiRequestResult } from './request'

function toQuery(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value))
    }
  })
  return search.toString()
}

/** 分页条件查询 GET /orders */
export async function getOrderPage(params) {
  const query = toQuery(params)
  const result = await apiRequest(`/orders${query ? `?${query}` : ''}`, { method: 'GET' })
  return result.data || { total: 0, rows: [] }
}

/** 详情 GET /orders/{id} */
export async function getOrderDetail(id) {
  const result = await apiRequest(`/orders/${id}`, { method: 'GET' })
  return result.data || null
}

/**
 * 创建订单（预约）POST /orders
 * 时段冲突时后端可能返回 code=0，此处抛出后端 msg。
 */
export async function createOrder(payload) {
  const result = await apiRequestResult('/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  if (result.code !== 1) {
    throw new Error(result.msg || '预约失败')
  }
  return result.data
}

/** 修改订单 PUT /orders */
export async function updateOrder(payload) {
  const result = await apiRequestResult('/orders', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  if (result.code !== 1) {
    throw new Error(result.msg || '修改失败')
  }
  return result.data
}

/** 更新状态 PATCH /orders/{id}/status */
export async function updateOrderStatus(id, status) {
  const result = await apiRequestResult(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
  if (result.code !== 1) {
    throw new Error(result.msg || '状态更新失败')
  }
  return result.data
}

/** 评价 PUT /orders/{id}/rating */
export async function rateOrder(id, payload) {
  const result = await apiRequest(`/orders/${id}/rating`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return result?.data
}

/** 删除 DELETE /orders/{id} */
export async function deleteOrder(id) {
  await apiRequest(`/orders/${id}`, { method: 'DELETE' })
}
