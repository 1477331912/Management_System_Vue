// 员工排班管理接口（与后端 /schedules 约定一致）。
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

/** 分页条件查询 GET /schedules */
export async function getSchedulePage(params) {
  const query = toQuery(params)
  const result = await apiRequest(`/schedules${query ? `?${query}` : ''}`, { method: 'GET' })
  return result.data || { total: 0, rows: [] }
}

/** 详情 GET /schedules/{id} */
export async function getScheduleDetail(id) {
  const result = await apiRequest(`/schedules/${id}`, { method: 'GET' })
  return result.data || null
}

/** 新增 POST /schedules */
export async function createSchedule(payload) {
  const result = await apiRequest('/schedules', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return result?.data
}

/** 修改 PUT /schedules */
export async function updateSchedule(payload) {
  const result = await apiRequest('/schedules', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
  return result?.data
}

/** 删除 DELETE /schedules/{id} */
export async function deleteSchedule(id) {
  await apiRequest(`/schedules/${id}`, { method: 'DELETE' })
}

/** 日历看板 GET /schedules/calendar */
export async function getScheduleCalendar(params) {
  const query = toQuery(params)
  const result = await apiRequest(`/schedules/calendar${query ? `?${query}` : ''}`, { method: 'GET' })
  return Array.isArray(result.data) ? result.data : []
}

/** 排班类型字典 GET /schedules/types（可选接口） */
export async function getScheduleTypes() {
  try {
    const result = await apiRequest('/schedules/types', { method: 'GET' })
    return Array.isArray(result.data) ? result.data : []
  } catch {
    // 后端未提供时由页面使用本地兜底字典。
    return []
  }
}

/** 新增/编辑排班员工下拉 GET /schedules/emp-options?deptId= */
export async function getScheduleEmpOptions(deptId) {
  const query = toQuery({ deptId })
  const result = await apiRequest(`/schedules/emp-options${query ? `?${query}` : ''}`, { method: 'GET' })
  return Array.isArray(result.data) ? result.data : []
}
