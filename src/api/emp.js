// 员工管理接口：
// 通过统一请求封装自动携带登录 token。
import { apiRequest } from './request'

// 把对象参数转为 queryString。
function toQuery(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value))
    }
  })
  return search.toString()
}

// 3.1 员工分页条件查询（GET /emps）
export async function getEmpPage(params) {
  const query = toQuery(params)
  const result = await apiRequest(`/emps${query ? `?${query}` : ''}`, { method: 'GET' })
  return result.data || { total: 0, rows: [] }
}

// 3.2 根据 ID 查询员工详情（GET /emps/{id}）
export async function getEmpDetailById(id) {
  const result = await apiRequest(`/emps/${id}`, { method: 'GET' })
  return result.data || null
}

// 3.3 新增员工（POST /emps）
export async function createEmp(payload) {
  await apiRequest('/emps', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

// 3.4 修改员工（PUT /emps）
export async function updateEmp(payload) {
  await apiRequest('/emps', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

// 3.5 查询全部员工（GET /emps/list）
export async function getEmpListAll() {
  const result = await apiRequest('/emps/list', { method: 'GET' })
  return result.data || []
}

// 3.6 批量删除员工（DELETE /emps/batch?ids=1,2,3）
export async function deleteEmpBatch(ids = []) {
  const idText = Array.isArray(ids) ? ids.join(',') : String(ids || '')
  await apiRequest(`/emps/batch?ids=${encodeURIComponent(idText)}`, { method: 'DELETE' })
}
