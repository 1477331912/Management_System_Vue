<script setup>
// 服务项目管理：分页查询、详情、新增、编辑、删除。
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getDeptList } from '@/api/dept'
import {
  createServiceItem,
  deleteServiceItem,
  getServiceItemDetail,
  getServiceItemPage,
  updateServiceItem
} from '@/api/serviceItem'

const queryForm = reactive({
  name: '',
  deptId: ''
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const deptOptions = ref([])

const dialogVisible = ref(false)
const editMode = ref('create')
const formRef = ref()
const submitLoading = ref(false)

const itemForm = reactive({
  id: undefined,
  name: '',
  deptId: undefined,
  price: undefined,
  durationMinutes: undefined,
  qualificationRequired: ''
})

const formRules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  deptId: [{ required: true, message: '请选择所属部门', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  durationMinutes: [{ required: true, message: '请输入时长', trigger: 'blur' }]
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)

function formatMoney(n) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '--'
  return `¥${Number(n).toFixed(2)}`
}

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

function buildQueryParams() {
  return {
    name: queryForm.name.trim() || undefined,
    deptId: queryForm.deptId === '' ? undefined : queryForm.deptId,
    page: page.value,
    pageSize: pageSize.value
  }
}

async function fetchDeptOptions() {
  try {
    const list = await getDeptList()
    deptOptions.value = Array.isArray(list) ? list : []
  } catch (error) {
    ElMessage.error(error.message || '加载部门列表失败')
  }
}

async function fetchTableData() {
  loading.value = true
  try {
    const result = await getServiceItemPage(buildQueryParams())
    tableData.value = Array.isArray(result.rows) ? result.rows : []
    total.value = Number(result.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '查询服务项目失败')
  } finally {
    loading.value = false
  }
}

async function onSearch() {
  page.value = 1
  await fetchTableData()
}

async function onReset() {
  queryForm.name = ''
  queryForm.deptId = ''
  page.value = 1
  await fetchTableData()
}

async function onCurrentChange(current) {
  page.value = current
  await fetchTableData()
}

async function onSizeChange(size) {
  pageSize.value = size
  page.value = 1
  await fetchTableData()
}

function resetForm() {
  itemForm.id = undefined
  itemForm.name = ''
  itemForm.deptId = undefined
  itemForm.price = undefined
  itemForm.durationMinutes = undefined
  itemForm.qualificationRequired = ''
}

function openCreateDialog() {
  editMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editMode.value = 'edit'
  itemForm.id = row.id
  itemForm.name = row.name || ''
  itemForm.deptId = row.deptId
  itemForm.price = row.price
  itemForm.durationMinutes = row.durationMinutes
  itemForm.qualificationRequired = row.qualificationRequired || ''
  dialogVisible.value = true
}

async function openDetailDialog(row) {
  detailVisible.value = true
  detailData.value = null
  detailLoading.value = true
  try {
    detailData.value = await getServiceItemDetail(row.id)
  } catch (error) {
    ElMessage.error(error.message || '加载详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function buildSubmitPayload() {
  const payload = {
    name: itemForm.name.trim(),
    deptId: itemForm.deptId,
    price: Number(itemForm.price),
    durationMinutes: Number(itemForm.durationMinutes),
    qualificationRequired: itemForm.qualificationRequired?.trim() || undefined
  }
  if (editMode.value === 'edit') {
    payload.id = itemForm.id
  }
  return payload
}

async function onSubmit() {
  try {
    await formRef.value.validate()
    const p = itemForm.price
    const d = itemForm.durationMinutes
    if (p === undefined || p === null || Number(p) < 0) {
      ElMessage.warning('请输入有效的价格')
      return
    }
    if (d === undefined || d === null || Number(d) < 1 || !Number.isInteger(Number(d))) {
      ElMessage.warning('时长需为不小于 1 的整数（分钟）')
      return
    }
    submitLoading.value = true
    const payload = buildSubmitPayload()
    if (editMode.value === 'create') {
      await createServiceItem(payload)
      ElMessage.success('新增服务项目成功')
    } else {
      await updateServiceItem(payload)
      ElMessage.success('修改服务项目成功')
    }
    dialogVisible.value = false
    await fetchTableData()
  } catch (error) {
    if (error?.message) ElMessage.error(error.message)
  } finally {
    submitLoading.value = false
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除服务项目「${row.name}」吗？若已被订单引用将无法删除。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deleteServiceItem(row.id)
    ElMessage.success('删除成功')
    await fetchTableData()
  } catch (error) {
    if (error !== 'cancel' && error?.message) ElMessage.error(error.message)
  }
}

const dialogTitle = computed(() => (editMode.value === 'create' ? '新增服务项目' : '编辑服务项目'))

onMounted(async () => {
  await fetchDeptOptions()
  await fetchTableData()
})
</script>

<template>
  <div class="service-page">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="服务名称">
          <el-input v-model="queryForm.name" placeholder="模糊查询" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="所属部门">
          <el-select v-model="queryForm.deptId" placeholder="全部" clearable filterable style="width: 200px">
            <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="toolbar">
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新增服务项目
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      class="data-table"
      empty-text="暂无服务项目"
    >
      <el-table-column prop="name" label="服务名称" min-width="140" align="center" show-overflow-tooltip />
      <el-table-column prop="deptName" label="所属部门" min-width="120" align="center" show-overflow-tooltip />
      <el-table-column label="价格" width="110" align="center">
        <template #default="{ row }">
          <span class="price-text">{{ formatMoney(row.price) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="时长" width="100" align="center">
        <template #default="{ row }">
          {{ row.durationMinutes != null ? `${row.durationMinutes} 分钟` : '--' }}
        </template>
      </el-table-column>
      <el-table-column prop="qualificationRequired" label="资质要求" min-width="140" align="center" show-overflow-tooltip />
      <el-table-column label="创建时间" min-width="165" align="center">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetailDialog(row)">详情</el-button>
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close align-center>
      <el-form ref="formRef" :model="itemForm" :rules="formRules" label-width="108px" class="dialog-form">
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="itemForm.name" maxlength="64" show-word-limit placeholder="如：标准洗护" />
        </el-form-item>
        <el-form-item label="所属部门" prop="deptId">
          <el-select v-model="itemForm.deptId" filterable placeholder="请选择部门" style="width: 100%">
            <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格(元)" prop="price">
          <el-input-number v-model="itemForm.price" :min="0" :precision="2" :step="10" style="width: 100%" />
        </el-form-item>
        <el-form-item label="时长(分钟)" prop="durationMinutes">
          <el-input-number v-model="itemForm.durationMinutes" :min="1" :precision="0" :step="5" style="width: 100%" />
        </el-form-item>
        <el-form-item label="资质要求">
          <el-input
            v-model="itemForm.qualificationRequired"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="选填，如：初级美容师"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="服务项目详情" width="560px" destroy-on-close align-center>
      <div v-loading="detailLoading" class="detail-wrap">
        <template v-if="detailData && !detailLoading">
          <el-descriptions :column="1" border>
            <el-descriptions-item label="服务名称">{{ detailData.name || '--' }}</el-descriptions-item>
            <el-descriptions-item label="所属部门">{{ detailData.deptName || '--' }}</el-descriptions-item>
            <el-descriptions-item label="价格">{{ formatMoney(detailData.price) }}</el-descriptions-item>
            <el-descriptions-item label="所需时长">
              {{ detailData.durationMinutes != null ? `${detailData.durationMinutes} 分钟` : '--' }}
            </el-descriptions-item>
            <el-descriptions-item label="资质要求">{{ detailData.qualificationRequired || '--' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(detailData.createTime) }}</el-descriptions-item>
            <el-descriptions-item label="最后修改">{{ formatDateTime(detailData.updateTime) }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.service-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.filter-card :deep(.el-card__body) {
  padding-bottom: 4px;
}

.filter-form {
  flex-wrap: wrap;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.data-table {
  width: 100%;
}

.price-text {
  font-weight: 600;
  color: #c45656;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.dialog-form {
  padding-right: 8px;
}

.detail-wrap {
  min-height: 80px;
}
</style>
