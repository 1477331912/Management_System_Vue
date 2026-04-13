<script setup>
// 客户管理：分页查询、详情（含宠物）、新增、编辑、删除。
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  createCustomer,
  deleteCustomer,
  getCustomerDetail,
  getCustomerPage,
  updateCustomer
} from '@/api/customer'

const memberLevelOptions = [
  { label: '普通', value: 1 },
  { label: '白银', value: 2 },
  { label: '黄金', value: 3 },
  { label: '钻石', value: 4 }
]

const queryForm = reactive({
  name: '',
  phone: '',
  memberLevel: ''
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const editMode = ref('create')
const formRef = ref()
const submitLoading = ref(false)

const customerForm = reactive({
  id: undefined,
  name: '',
  phone: '',
  address: '',
  memberLevel: 1
})

const formRules = {
  name: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^\d{11}$/, message: '手机号为 11 位数字', trigger: 'blur' }
  ]
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)

function memberLevelText(level) {
  const found = memberLevelOptions.find((x) => x.value === level)
  return found?.label || '--'
}

function memberLevelTagType(level) {
  if (level === 4) return 'danger'
  if (level === 3) return 'warning'
  if (level === 2) return 'success'
  return 'info'
}

function petGenderText(g) {
  if (g === 1) return '公'
  if (g === 2) return '母'
  return '--'
}

function vaccineText(v) {
  if (v === 1) return '已接种'
  if (v === 0 || v === 2) return '未接种'
  return String(v ?? '--')
}

function resolveImageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) return `/api${path}`
  return `/api/${path}`
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
    phone: queryForm.phone.trim() || undefined,
    memberLevel: queryForm.memberLevel === '' ? undefined : queryForm.memberLevel,
    page: page.value,
    pageSize: pageSize.value
  }
}

async function fetchTableData() {
  loading.value = true
  try {
    const result = await getCustomerPage(buildQueryParams())
    tableData.value = Array.isArray(result.rows) ? result.rows : []
    total.value = Number(result.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '查询客户失败')
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
  queryForm.phone = ''
  queryForm.memberLevel = ''
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
  customerForm.id = undefined
  customerForm.name = ''
  customerForm.phone = ''
  customerForm.address = ''
  customerForm.memberLevel = 1
}

function openCreateDialog() {
  editMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editMode.value = 'edit'
  customerForm.id = row.id
  customerForm.name = row.name || ''
  customerForm.phone = row.phone || ''
  customerForm.address = row.address || ''
  customerForm.memberLevel = row.memberLevel ?? 1
  dialogVisible.value = true
}

async function openDetailDialog(row) {
  detailVisible.value = true
  detailData.value = null
  detailLoading.value = true
  try {
    detailData.value = await getCustomerDetail(row.id)
  } catch (error) {
    ElMessage.error(error.message || '加载详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function buildSubmitPayload() {
  const base = {
    name: customerForm.name.trim(),
    phone: customerForm.phone.trim(),
    address: customerForm.address?.trim() || undefined,
    memberLevel: customerForm.memberLevel ?? 1
  }
  if (editMode.value === 'edit') {
    return { id: customerForm.id, ...base }
  }
  return base
}

async function onSubmit() {
  try {
    await formRef.value.validate()
    submitLoading.value = true
    const payload = buildSubmitPayload()
    if (editMode.value === 'create') {
      await createCustomer(payload)
      ElMessage.success('新增客户成功')
    } else {
      await updateCustomer(payload)
      ElMessage.success('修改客户成功')
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
      `确认删除客户「${row.name}」吗？若其名下仍有宠物，请先处理宠物数据。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deleteCustomer(row.id)
    ElMessage.success('删除成功')
    await fetchTableData()
  } catch (error) {
    if (error !== 'cancel' && error?.message) ElMessage.error(error.message)
  }
}

const dialogTitle = computed(() => (editMode.value === 'create' ? '新增客户' : '编辑客户'))

onMounted(() => {
  fetchTableData()
})
</script>

<template>
  <div class="customer-page">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="姓名">
          <el-input v-model="queryForm.name" placeholder="模糊查询" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="queryForm.phone" placeholder="精确查询" clearable maxlength="11" style="width: 160px" />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="queryForm.memberLevel" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="opt in memberLevelOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
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
        新增客户
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      class="data-table"
      empty-text="暂无客户数据"
    >
      <el-table-column prop="name" label="姓名" min-width="100" align="center" show-overflow-tooltip />
      <el-table-column prop="phone" label="手机号" width="130" align="center" />
      <el-table-column prop="address" label="地址" min-width="200" align="center" show-overflow-tooltip />
      <el-table-column label="会员等级" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="memberLevelTagType(row.memberLevel)" effect="plain" size="small">
            {{ memberLevelText(row.memberLevel) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最后修改时间" min-width="170" align="center">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
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

    <!-- 新增/编辑 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close align-center>
      <el-form ref="formRef" :model="customerForm" :rules="formRules" label-width="96px" class="dialog-form">
        <el-form-item label="客户姓名" prop="name">
          <el-input v-model="customerForm.name" placeholder="请输入姓名" maxlength="32" show-word-limit />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="customerForm.phone" maxlength="11" placeholder="11 位手机号" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="customerForm.address" type="textarea" :rows="2" placeholder="选填" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="会员等级">
          <el-select v-model="customerForm.memberLevel" style="width: 100%">
            <el-option v-for="opt in memberLevelOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情（含宠物） -->
    <el-dialog
      v-model="detailVisible"
      title="客户详情"
      width="820px"
      destroy-on-close
      align-center
      class="detail-dialog"
    >
      <div v-loading="detailLoading" class="detail-body">
        <template v-if="detailData && !detailLoading">
          <div class="detail-section">
            <div class="section-title">基本信息</div>
            <el-descriptions :column="2" border size="default">
              <el-descriptions-item label="姓名">{{ detailData.name || '--' }}</el-descriptions-item>
              <el-descriptions-item label="手机号">{{ detailData.phone || '--' }}</el-descriptions-item>
              <el-descriptions-item label="会员等级">
                <el-tag :type="memberLevelTagType(detailData.memberLevel)" effect="plain" size="small">
                  {{ memberLevelText(detailData.memberLevel) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="最后修改">{{ formatDateTime(detailData.updateTime) }}</el-descriptions-item>
              <el-descriptions-item label="地址" :span="2">{{ detailData.address || '--' }}</el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="detail-section">
            <div class="section-title">名下宠物</div>
            <el-table
              v-if="detailData.petList?.length"
              :data="detailData.petList"
              border
              size="small"
              class="pet-table"
            >
              <el-table-column label="照片" width="72" align="center">
                <template #default="{ row }">
                  <el-avatar :size="40" :src="resolveImageUrl(row.image)" shape="square">
                    {{ row.nickname?.slice(0, 1) || '宠' }}
                  </el-avatar>
                </template>
              </el-table-column>
              <el-table-column prop="nickname" label="昵称" min-width="90" align="center" />
              <el-table-column prop="breed" label="品种" min-width="90" align="center" />
              <el-table-column label="性别" width="64" align="center">
                <template #default="{ row }">{{ petGenderText(row.gender) }}</template>
              </el-table-column>
              <el-table-column prop="birthday" label="生日" width="120" align="center" />
              <el-table-column label="体重(kg)" width="88" align="center">
                <template #default="{ row }">{{ row.weight != null ? row.weight : '--' }}</template>
              </el-table-column>
              <el-table-column label="疫苗" width="88" align="center">
                <template #default="{ row }">{{ vaccineText(row.vaccineStatus) }}</template>
              </el-table-column>
              <el-table-column prop="allergyHistory" label="过敏史" min-width="100" show-overflow-tooltip />
            </el-table>
            <el-empty v-else description="暂无宠物档案" :image-size="72" />
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.customer-page {
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

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.dialog-form {
  padding-right: 8px;
}

.detail-body {
  min-height: 120px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f3a5f;
  margin-bottom: 12px;
  padding-left: 10px;
  border-left: 3px solid #4f8ad9;
}

.pet-table {
  width: 100%;
}

.detail-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}
</style>
