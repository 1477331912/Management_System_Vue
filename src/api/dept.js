// 部门管理接口：
// 通过统一请求封装自动携带登录 token。
import { apiRequest } from './request'

// 查询全部部门（GET /depts）
export async function getDeptList() {
  const result = await apiRequest('/depts', { method: 'GET' })
  return result.data || []
}

// 新增部门（POST /depts）
export async function createDept(payload) {
  await apiRequest('/depts', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

// 修改部门（PUT /depts）
export async function updateDept(payload) {
  await apiRequest('/depts', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

// 删除部门（DELETE /depts/{id}）
export async function deleteDeptById(id) {
  await apiRequest(`/depts/${id}`, { method: 'DELETE' })
}

// 批量删除部门（DELETE /depts/batch?ids=1,2,3）
export async function deleteDeptBatch(ids = []) {
  const idText = Array.isArray(ids) ? ids.join(',') : String(ids || '')
  await apiRequest(`/depts/batch?ids=${encodeURIComponent(idText)}`, { method: 'DELETE' })
}
