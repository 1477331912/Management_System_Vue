<script setup>
// 员工管理页面：
// 实现条件分页查询、批量删除、新增、编辑（含工作经历）等功能。
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import { getDeptList } from '@/api/dept'
import { createEmp, deleteEmpBatch, getEmpDetailById, getEmpPage, updateEmp } from '@/api/emp'
import { uploadFile } from '@/api/upload'

// 性别选项映射（与接口文档保持一致：1男 2女）。
const genderOptions = [
  { label: '男', value: 1 },
  { label: '女', value: 2 }
]

// 职位选项映射（与数据库枚举一致）。
const positionOptions = [
  { label: '美容师', value: 1 },
  { label: '宠物医生', value: 2 },
  { label: '训练师', value: 3 },
  { label: '宠物营养师', value: 4 },
  { label: '宠物咨询师', value: 5 },
  { label: '宠物保姆', value: 6 },
  { label: '店员', value: 7 },
  { label: '卫生员', value: 8 }
]

// 查询条件模型。
const queryForm = reactive({
  name: '',
  gender: '',
  dateRange: []
})

// 表格与分页状态。
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 批量选择状态。
const selectedIds = ref([])

// 部门下拉选项数据。
const deptOptions = ref([])

// 弹窗与编辑状态。
const dialogVisible = ref(false)
const editMode = ref('create') // create | edit
const formRef = ref()
const submitLoading = ref(false)
// 头像上传状态。
const avatarUploading = ref(false)

// 员工表单模型（新增/编辑共用）。
const empForm = reactive({
  id: undefined,
  username: '',
  name: '',
  gender: 1,
  phone: '',
  salary: undefined,
  deptId: undefined,
  position: undefined,
  entryDate: '',
  image: '',
  exprList: []
})

// 员工表单校验规则（按接口文档约束）。
const empRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[A-Za-z]{2,20}$/, message: '用户名需为 2-20 位字母', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5]{2,10}$/, message: '姓名需为 2-10 位汉字', trigger: 'blur' }
  ],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^\d{11}$/, message: '手机号需为 11 位数字', trigger: 'blur' }
  ]
}

// 工作经历行校验：仅在至少填写一项时才要求完整。
function validateExprRow(row) {
  const hasAny = row.startDate || row.endDate || row.company || row.position
  if (!hasAny) return true
  return Boolean(row.startDate && row.endDate && row.company && row.position)
}

// 文本映射：把枚举值转换为显示文案。
function genderText(gender) {
  return gender === 1 ? '男' : gender === 2 ? '女' : '--'
}

function positionText(position) {
  const found = positionOptions.find((item) => item.value === position)
  return found?.label || '--'
}

// 头像地址处理：
// - 若后端返回完整 URL（http/https），直接使用
// - 若返回相对路径，则拼接 /api 前缀通过代理访问后端图片资源
function resolveAvatarUrl(imagePath) {
  if (!imagePath) return ''
  if (/^https?:\/\//i.test(imagePath)) return imagePath
  if (imagePath.startsWith('/')) return `/api${imagePath}`
  return `/api/${imagePath}`
}

// 上传前校验：仅允许图片且大小不超过 5MB。
function beforeAvatarUpload(file) {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.warning('请上传图片文件')
    return false
  }

  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    ElMessage.warning('图片大小不能超过 5MB')
    return false
  }
  return true
}

// 自定义上传：调用公共上传接口，成功后回填头像地址并预览。
async function uploadAvatar(option) {
  try {
    avatarUploading.value = true
    const imageUrl = await uploadFile(option.file)
    empForm.image = imageUrl
    option.onSuccess?.(imageUrl)
    ElMessage.success('图片上传成功')
  } catch (error) {
    option.onError?.(error)
    ElMessage.error(error.message || '图片上传失败')
  } finally {
    avatarUploading.value = false
  }
}

// 清空已上传头像。
function clearAvatar() {
  empForm.image = ''
}

// 日期格式化：把时间字符串转换为更友好的展示文本。
function formatDateTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

// 从查询表单构建接口参数。
function buildQueryParams() {
  const [beginDate, endDate] = queryForm.dateRange || []
  return {
    name: queryForm.name.trim(),
    gender: queryForm.gender || undefined,
    beginDate: beginDate || undefined,
    endDate: endDate || undefined,
    page: page.value,
    pageSize: pageSize.value
  }
}

// 拉取部门下拉数据。
async function fetchDeptOptions() {
  try {
    const list = await getDeptList()
    deptOptions.value = Array.isArray(list) ? list : []
  } catch (error) {
    ElMessage.error(error.message || '获取部门列表失败')
  }
}

// 拉取员工分页数据。
async function fetchTableData() {
  loading.value = true
  try {
    const result = await getEmpPage(buildQueryParams())
    tableData.value = Array.isArray(result.rows) ? result.rows : []
    total.value = Number(result.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '查询员工失败')
  } finally {
    loading.value = false
  }
}

// 查询按钮：回到第一页再查询。
async function onSearch() {
  page.value = 1
  await fetchTableData()
}

// 重置按钮：清空条件并回到第一页。
async function onReset() {
  queryForm.name = ''
  queryForm.gender = ''
  queryForm.dateRange = []
  page.value = 1
  await fetchTableData()
}

// 分页事件：页码变化。
async function onCurrentChange(current) {
  page.value = current
  await fetchTableData()
}

// 分页事件：每页条数变化。
async function onSizeChange(size) {
  pageSize.value = size
  page.value = 1
  await fetchTableData()
}

// 表格多选变化：记录当前选中 ID。
function onSelectionChange(rows) {
  selectedIds.value = rows.map((item) => item.id)
}

// 添加一条空工作经历。
function addExprRow() {
  empForm.exprList.push({
    startDate: '',
    endDate: '',
    company: '',
    position: ''
  })
}

// 删除指定工作经历。
function removeExprRow(index) {
  empForm.exprList.splice(index, 1)
}

// 重置员工表单。
function resetEmpForm() {
  empForm.id = undefined
  empForm.username = ''
  empForm.name = ''
  empForm.gender = 1
  empForm.phone = ''
  empForm.salary = undefined
  empForm.deptId = undefined
  empForm.position = undefined
  empForm.entryDate = ''
  empForm.image = ''
  empForm.exprList = []
}

// 打开新增弹窗。
function openCreateDialog() {
  editMode.value = 'create'
  resetEmpForm()
  dialogVisible.value = true
}

// 打开编辑弹窗：
// 先请求详情接口，回填员工基础信息与工作经历。
async function openEditDialog(row) {
  editMode.value = 'edit'
  resetEmpForm()
  try {
    const detail = await getEmpDetailById(row.id)
    if (!detail) throw new Error('未获取到员工详情')
    empForm.id = detail.id
    empForm.username = detail.username || ''
    empForm.name = detail.name || ''
    empForm.gender = detail.gender || 1
    empForm.phone = detail.phone || ''
    empForm.salary = detail.salary
    empForm.deptId = detail.deptId
    empForm.position = detail.position
    empForm.entryDate = detail.entryDate || ''
    empForm.image = detail.image || ''
    empForm.exprList = Array.isArray(detail.exprList)
      ? detail.exprList.map((item) => ({
          startDate: item.startDate || '',
          endDate: item.endDate || '',
          company: item.company || '',
          position: item.position || ''
        }))
      : []
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '获取员工详情失败')
  }
}

// 组装提交 payload。
function buildSubmitPayload() {
  const payload = {
    username: empForm.username.trim(),
    name: empForm.name.trim(),
    gender: empForm.gender,
    phone: empForm.phone.trim(),
    salary: empForm.salary,
    deptId: empForm.deptId,
    position: empForm.position,
    entryDate: empForm.entryDate || undefined,
    image: empForm.image?.trim() || undefined,
    exprList: empForm.exprList
      .filter((item) => item.startDate || item.endDate || item.company || item.position)
      .map((item) => ({
        startDate: item.startDate,
        endDate: item.endDate,
        company: item.company?.trim(),
        position: item.position?.trim()
      }))
  }

  if (editMode.value === 'edit') {
    payload.id = empForm.id
  }

  return payload
}

// 提交新增/修改。
async function onSubmit() {
  try {
    await formRef.value.validate()

    // 校验每一条工作经历完整性。
    const invalidExpr = empForm.exprList.some((item) => !validateExprRow(item))
    if (invalidExpr) {
      ElMessage.warning('若填写工作经历，请把开始日期、结束日期、公司、职位填写完整')
      return
    }

    submitLoading.value = true
    const payload = buildSubmitPayload()
    if (editMode.value === 'create') {
      await createEmp(payload)
      ElMessage.success('新增员工成功')
    } else {
      await updateEmp(payload)
      ElMessage.success('修改员工成功')
    }

    dialogVisible.value = false
    await fetchTableData()
  } catch (error) {
    if (error?.message) {
      ElMessage.error(error.message)
    }
  } finally {
    submitLoading.value = false
  }
}

// 批量删除。
async function onBatchDelete() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先勾选要删除的员工')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedIds.value.length} 名员工吗？`,
      '批量删除确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    )
    await deleteEmpBatch(selectedIds.value)
    ElMessage.success('批量删除成功')
    await fetchTableData()
  } catch (error) {
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message)
    }
  }
}

// 单条删除：
// 复用批量删除接口，传入单个 ID 即可实现删除功能。
async function onSingleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除员工“${row.name}”吗？删除后不可恢复。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    )
    await deleteEmpBatch([row.id])
    ElMessage.success('删除员工成功')
    await fetchTableData()
  } catch (error) {
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message)
    }
  }
}

// 当前弹窗标题。
const dialogTitle = computed(() => (editMode.value === 'create' ? '新增员工' : '编辑员工'))

// 页面初始化：
// 先拉部门列表，再拉员工分页列表。
onMounted(async () => {
  await fetchDeptOptions()
  await fetchTableData()
})
</script>

<template>
  <div class="emp-page">
    <!-- 查询区域：姓名、性别、入职日期范围。 -->
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="姓名">
          <el-input v-model="queryForm.name" placeholder="请输入姓名" clearable />
        </el-form-item>

        <el-form-item label="性别">
          <el-select v-model="queryForm.gender" placeholder="请选择" clearable style="width: 120px">
            <el-option v-for="item in genderOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="入职日期">
          <el-date-picker
            v-model="queryForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏：新增与批量删除。 -->
    <div class="toolbar">
      <el-button type="primary" @click="openCreateDialog">+ 新增员工</el-button>
      <el-button type="danger" plain @click="onBatchDelete">
        <el-icon><Delete /></el-icon>
        批量删除
      </el-button>
    </div>

    <!-- 表格区域。 -->
    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      class="emp-table"
      empty-text="暂无员工数据"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="56" align="center" />
      <el-table-column prop="name" label="姓名" min-width="120" align="center" />
      <el-table-column label="性别" width="80" align="center">
        <template #default="{ row }">{{ genderText(row.gender) }}</template>
      </el-table-column>
      <el-table-column prop="image" label="头像" width="88" align="center">
        <template #default="{ row }">
          <el-avatar :size="34" :src="resolveAvatarUrl(row.image)">{{ row.name?.slice(0, 1) }}</el-avatar>
        </template>
      </el-table-column>
      <el-table-column prop="deptName" label="所属部门" min-width="140" align="center" />
      <el-table-column label="职位" min-width="120" align="center">
        <template #default="{ row }">{{ positionText(row.position) }}</template>
      </el-table-column>
      <el-table-column prop="entryDate" label="入职日期" min-width="130" align="center" />
      <el-table-column prop="updateTime" label="最后操作时间" min-width="180" align="center">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="180" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="onSingleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页区域。 -->
    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 30, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="onSizeChange"
        @current-change="onCurrentChange"
      />
    </div>

    <!-- 新增/编辑弹窗。 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="860px" destroy-on-close>
      <el-form ref="formRef" :model="empForm" :rules="empRules" label-width="90px" class="emp-form">
        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="empForm.username" placeholder="2-20 位字母" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="empForm.name" placeholder="2-10 位汉字" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="empForm.gender" style="width: 100%">
                <el-option v-for="item in genderOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="empForm.phone" maxlength="11" placeholder="11 位手机号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="所属部门">
              <el-select v-model="empForm.deptId" clearable placeholder="请选择" style="width: 100%">
                <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="职位">
              <el-select v-model="empForm.position" clearable placeholder="请选择" style="width: 100%">
                <el-option
                  v-for="item in positionOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="14">
          <el-col :span="12">
            <el-form-item label="薪资">
              <el-input-number v-model="empForm.salary" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入职日期">
              <el-date-picker v-model="empForm.entryDate" value-format="YYYY-MM-DD" type="date" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="头像上传">
          <div class="avatar-upload-wrap">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :http-request="uploadAvatar"
              :before-upload="beforeAvatarUpload"
              accept="image/*"
            >
              <img
                v-if="empForm.image"
                :src="resolveAvatarUrl(empForm.image)"
                alt="头像预览"
                class="avatar-preview"
              />
              <el-icon v-else class="avatar-uploader-icon">
                <Plus />
              </el-icon>
            </el-upload>

            <div class="avatar-upload-tip">
              <span v-if="avatarUploading">图片上传中...</span>
              <span v-else>支持 jpg/png/webp，大小不超过 5MB</span>
              <el-button v-if="empForm.image" link type="danger" @click="clearAvatar">移除图片</el-button>
            </div>
          </div>
        </el-form-item>

        <!-- 工作经历区域。 -->
        <div class="expr-header">
          <span>工作经历</span>
          <el-button link type="primary" @click="addExprRow">+ 添加经历</el-button>
        </div>

        <div v-if="!empForm.exprList.length" class="expr-empty">暂无工作经历，可点击“添加经历”</div>

        <div v-for="(item, index) in empForm.exprList" :key="index" class="expr-item">
          <el-row :gutter="10">
            <el-col :span="6">
              <el-date-picker
                v-model="item.startDate"
                value-format="YYYY-MM-DD"
                type="date"
                placeholder="开始日期"
                style="width: 100%"
              />
            </el-col>
            <el-col :span="6">
              <el-date-picker
                v-model="item.endDate"
                value-format="YYYY-MM-DD"
                type="date"
                placeholder="结束日期"
                style="width: 100%"
              />
            </el-col>
            <el-col :span="6">
              <el-input v-model="item.company" placeholder="公司名称" />
            </el-col>
            <el-col :span="5">
              <el-input v-model="item.position" placeholder="职位名称" />
            </el-col>
            <el-col :span="1" class="expr-delete-col">
              <el-button link type="danger" @click="removeExprRow(index)">删</el-button>
            </el-col>
          </el-row>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :loading="submitLoading" type="primary" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页面主容器。 */
.emp-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 查询卡片与操作栏。 */
.filter-card :deep(.el-card__body) {
  padding-bottom: 6px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 表格和分页区域。 */
.emp-table {
  width: 100%;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

/* 弹窗表单与工作经历样式。 */
.emp-form {
  margin-top: 4px;
}

.expr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  margin-bottom: 8px;
  color: #303133;
}

.expr-empty {
  margin-bottom: 10px;
  color: #909399;
  font-size: 13px;
}

.expr-item {
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafafa;
}

.expr-delete-col {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 头像上传展示区。 */
.avatar-upload-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-uploader :deep(.el-upload) {
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  width: 96px;
  height: 96px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 26px;
  color: #8c939d;
}

.avatar-preview {
  width: 96px;
  height: 96px;
  display: block;
  object-fit: cover;
}

.avatar-upload-tip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #909399;
  font-size: 12px;
}
</style>

