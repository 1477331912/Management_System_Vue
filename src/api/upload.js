// 通用文件上传接口：
// 供员工管理、部门管理等多个业务模块复用；上传请求同样携带 token。
import { apiRequest } from './request'

// 上传单个文件（POST /upload）：
// 入参为 File，出参为后端返回的文件访问 URL。
export async function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  const result = await apiRequest('/upload', {
    method: 'POST',
    body: formData
  })

  return result.data || ''
}
