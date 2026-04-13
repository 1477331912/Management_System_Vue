<script setup>
// 订单管理：查询、预约、改单、状态流转、评价、删除。
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getCustomerPage } from '@/api/customer'
import { getEmpListAll } from '@/api/emp'
import {
  createOrder,
  deleteOrder,
  getOrderDetail,
  getOrderPage,
  rateOrder,
  updateOrder,
  updateOrderStatus
} from '@/api/order'
import { getPetPage } from '@/api/pet'
import { getServiceItemPage } from '@/api/serviceItem'

const statusOptions = [
  { label: '待确认', value: 1 },
  { label: '进行中', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已取消', value: 4 }
]

function statusTagType(s) {
  if (s === 1) return 'warning'
  if (s === 2) return 'primary'
  if (s === 3) return 'success'
  if (s === 4) return 'info'
  return 'info'
}

const queryForm = reactive({
  orderNo: '',
  customerName: '',
  petNickname: '',
  status: '',
  timeRange: []
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const customerOptions = ref([])
const empOptions = ref([])
const serviceItemOptions = ref([])

const createVisible = ref(false)
const createFormRef = ref()
const createSubmitting = ref(false)
const createForm = reactive({
  customerId: undefined,
  petId: undefined,
  serviceItemId: undefined,
  empId: undefined,
  serviceTime: '',
  durationMinutes: undefined
})
const createRules = {
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  petId: [{ required: true, message: '请选择宠物', trigger: 'change' }],
  serviceItemId: [{ required: true, message: '请选择服务项目', trigger: 'change' }],
  empId: [{ required: true, message: '请选择服务师', trigger: 'change' }],
  serviceTime: [{ required: true, message: '请选择预约时间', trigger: 'change' }]
}
const petOptionsForCreate = ref([])

const editVisible = ref(false)
const editFormRef = ref()
const editSubmitting = ref(false)
const editForm = reactive({
  id: undefined,
  serviceTime: '',
  empId: undefined,
  petId: undefined,
  serviceItemId: undefined,
  customerId: undefined
})
const petOptionsForEdit = ref([])

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)

const ratingVisible = ref(false)
const ratingSubmitting = ref(false)
const ratingRow = ref(null)
const ratingForm = reactive({ rating: 5, comment: '' })

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

function formatMoney(n) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '--'
  return `¥${Number(n).toFixed(2)}`
}

function buildQueryParams() {
  const [beginTime, endTime] = queryForm.timeRange || []
  return {
    orderNo: queryForm.orderNo.trim() || undefined,
    customerName: queryForm.customerName.trim() || undefined,
    petNickname: queryForm.petNickname.trim() || undefined,
    status: queryForm.status === '' ? undefined : queryForm.status,
    beginTime: beginTime || undefined,
    endTime: endTime || undefined,
    page: page.value,
    pageSize: pageSize.value
  }
}

async function loadSelectOptions() {
  try {
    const [custRes, emps, svcRes] = await Promise.all([
      getCustomerPage({ page: 1, pageSize: 500 }),
      getEmpListAll(),
      getServiceItemPage({ page: 1, pageSize: 500 })
    ])
    customerOptions.value = Array.isArray(custRes.rows) ? custRes.rows : []
    empOptions.value = Array.isArray(emps) ? emps : []
    serviceItemOptions.value = Array.isArray(svcRes.rows) ? svcRes.rows : []
  } catch (error) {
    ElMessage.error(error.message || '加载下拉数据失败')
  }
}

async function fetchPetsForCustomer(customerId, target) {
  if (!customerId) {
    target.value = []
    return
  }
  try {
    const res = await getPetPage({ customerId, page: 1, pageSize: 500 })
    target.value = Array.isArray(res.rows) ? res.rows : []
  } catch {
    target.value = []
  }
}

watch(
  () => createForm.customerId,
  async (cid) => {
    createForm.petId = undefined
    await fetchPetsForCustomer(cid, petOptionsForCreate)
  }
)

async function fetchTableData() {
  loading.value = true
  try {
    const result = await getOrderPage(buildQueryParams())
    tableData.value = Array.isArray(result.rows) ? result.rows : []
    total.value = Number(result.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '查询订单失败')
  } finally {
    loading.value = false
  }
}

async function onSearch() {
  page.value = 1
  await fetchTableData()
}

async function onReset() {
  queryForm.orderNo = ''
  queryForm.customerName = ''
  queryForm.petNickname = ''
  queryForm.status = ''
  queryForm.timeRange = []
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

function resetCreateForm() {
  createForm.customerId = undefined
  createForm.petId = undefined
  createForm.serviceItemId = undefined
  createForm.empId = undefined
  createForm.serviceTime = ''
  createForm.durationMinutes = undefined
  petOptionsForCreate.value = []
}

function openCreateDialog() {
  resetCreateForm()
  createVisible.value = true
}

async function submitCreate() {
  try {
    await createFormRef.value.validate()
    createSubmitting.value = true
    const payload = {
      customerId: createForm.customerId,
      petId: createForm.petId,
      serviceItemId: createForm.serviceItemId,
      empId: createForm.empId,
      serviceTime: createForm.serviceTime
    }
    if (createForm.durationMinutes != null && createForm.durationMinutes !== '') {
      payload.durationMinutes = Number(createForm.durationMinutes)
    }
    await createOrder(payload)
    ElMessage.success('预约成功')
    createVisible.value = false
    await fetchTableData()
  } catch (error) {
    if (error?.message) ElMessage.error(error.message)
  } finally {
    createSubmitting.value = false
  }
}

async function openEditDialog(row) {
  editForm.id = row.id
  editForm.customerId = row.customerId
  editForm.serviceTime = row.serviceTime || ''
  editForm.empId = row.empId
  editForm.petId = row.petId
  editForm.serviceItemId = row.serviceItemId
  await fetchPetsForCustomer(row.customerId, petOptionsForEdit)
  editVisible.value = true
}

async function submitEdit() {
  try {
    editSubmitting.value = true
    const payload = {
      id: editForm.id,
      serviceTime: editForm.serviceTime || undefined,
      empId: editForm.empId,
      petId: editForm.petId,
      serviceItemId: editForm.serviceItemId
    }
    await updateOrder(payload)
    ElMessage.success('修改成功')
    editVisible.value = false
    await fetchTableData()
  } catch (error) {
    if (error?.message) ElMessage.error(error.message)
  } finally {
    editSubmitting.value = false
  }
}

async function openDetailDialog(row) {
  detailVisible.value = true
  detailData.value = null
  detailLoading.value = true
  try {
    detailData.value = await getOrderDetail(row.id)
  } catch (error) {
    ElMessage.error(error.message || '加载详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

async function confirmStatus(row, status, label) {
  try {
    await ElMessageBox.confirm(`确认将订单「${row.orderNo}」${label}？`, '状态变更', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await updateOrderStatus(row.id, status)
    ElMessage.success('状态已更新')
    await fetchTableData()
  } catch (error) {
    if (error !== 'cancel' && error?.message) ElMessage.error(error.message)
  }
}

function openRatingDialog(row) {
  ratingRow.value = row
  ratingForm.rating = row.rating && row.rating >= 1 ? row.rating : 5
  ratingForm.comment = row.comment || ''
  ratingVisible.value = true
}

async function submitRating() {
  if (!ratingRow.value) return
  try {
    ratingSubmitting.value = true
    await rateOrder(ratingRow.value.id, {
      rating: ratingForm.rating,
      comment: ratingForm.comment?.trim() || undefined
    })
    ElMessage.success('评价已提交')
    ratingVisible.value = false
    await fetchTableData()
  } catch (error) {
    if (error?.message) ElMessage.error(error.message)
  } finally {
    ratingSubmitting.value = false
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除订单「${row.orderNo}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    })
    await deleteOrder(row.id)
    ElMessage.success('已删除')
    await fetchTableData()
  } catch (error) {
    if (error !== 'cancel' && error?.message) ElMessage.error(error.message)
  }
}

const detailCustomer = computed(() => detailData.value?.customer)
const detailPet = computed(() => detailData.value?.pet)
const detailService = computed(() => detailData.value?.serviceItem)
const detailEmp = computed(() => detailData.value?.emp)

onMounted(async () => {
  await loadSelectOptions()
  await fetchTableData()
})
</script>

<template>
  <div class="order-page">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="订单号">
          <el-input v-model="queryForm.orderNo" placeholder="精确查询" clearable style="width: 168px" />
        </el-form-item>
        <el-form-item label="客户姓名">
          <el-input v-model="queryForm.customerName" placeholder="模糊查询" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="宠物昵称">
          <el-input v-model="queryForm.petNickname" placeholder="模糊查询" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务时间">
          <el-date-picker
            v-model="queryForm.timeRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始"
            end-placeholder="结束"
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

    <div class="toolbar">
      <el-button type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建预约
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      class="data-table"
      empty-text="暂无订单"
    >
      <el-table-column prop="orderNo" label="订单号" min-width="158" align="center" show-overflow-tooltip />
      <el-table-column prop="customerName" label="客户" min-width="88" align="center" show-overflow-tooltip />
      <el-table-column prop="petNickname" label="宠物" min-width="88" align="center" />
      <el-table-column prop="serviceItemName" label="服务项目" min-width="110" align="center" show-overflow-tooltip />
      <el-table-column prop="empName" label="服务师" min-width="88" align="center" />
      <el-table-column label="预约时间" min-width="158" align="center">
        <template #default="{ row }">{{ formatDateTime(row.serviceTime) }}</template>
      </el-table-column>
      <el-table-column label="时长" width="80" align="center">
        <template #default="{ row }">{{ row.durationMinutes != null ? `${row.durationMinutes}分` : '--' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small" effect="plain">
            {{ row.statusDesc || statusOptions.find((x) => x.value === row.status)?.label || '--' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="评分" width="100" align="center">
        <template #default="{ row }">
          <el-rate v-if="row.rating" :model-value="row.rating" disabled show-score text-color="#f7a23a" />
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetailDialog(row)">详情</el-button>
          <template v-if="row.status === 1">
            <el-button link type="primary" @click="openEditDialog(row)">改单</el-button>
            <el-button link type="success" @click="confirmStatus(row, 2, '开始服务（进入进行中）')">开始</el-button>
            <el-button link type="warning" @click="confirmStatus(row, 4, '取消订单')">取消</el-button>
          </template>
          <template v-else-if="row.status === 2">
            <el-button link type="success" @click="confirmStatus(row, 3, '完成服务')">完成</el-button>
            <el-button link type="warning" @click="confirmStatus(row, 4, '取消订单')">取消</el-button>
          </template>
          <template v-else-if="row.status === 3">
            <el-button link type="warning" @click="openRatingDialog(row)">评价</el-button>
          </template>
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

    <!-- 新建预约 -->
    <el-dialog v-model="createVisible" title="新建预约" width="520px" destroy-on-close align-center>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="客户" prop="customerId">
          <el-select v-model="createForm.customerId" filterable placeholder="请选择" style="width: 100%">
            <el-option v-for="c in customerOptions" :key="c.id" :label="`${c.name} · ${c.phone}`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="宠物" prop="petId">
          <el-select v-model="createForm.petId" filterable placeholder="先选客户" :disabled="!createForm.customerId" style="width: 100%">
            <el-option v-for="p in petOptionsForCreate" :key="p.id" :label="p.nickname" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务项目" prop="serviceItemId">
          <el-select v-model="createForm.serviceItemId" filterable placeholder="请选择" style="width: 100%">
            <el-option v-for="s in serviceItemOptions" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务师" prop="empId">
          <el-select v-model="createForm.empId" filterable placeholder="请选择" style="width: 100%">
            <el-option v-for="e in empOptions" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="预约时间" prop="serviceTime">
          <el-date-picker
            v-model="createForm.serviceTime"
            type="datetime"
            placeholder="选择日期时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="时长(分钟)">
          <el-input-number v-model="createForm.durationMinutes" :min="1" :precision="0" placeholder="不填则用项目默认" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreate">提交预约</el-button>
      </template>
    </el-dialog>

    <!-- 改单（待确认） -->
    <el-dialog v-model="editVisible" title="修改预约" width="520px" destroy-on-close align-center>
      <el-form ref="editFormRef" :model="editForm" label-width="100px">
        <el-form-item label="预约时间">
          <el-date-picker
            v-model="editForm.serviceTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="服务师">
          <el-select v-model="editForm.empId" filterable placeholder="请选择" style="width: 100%">
            <el-option v-for="e in empOptions" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="宠物">
          <el-select v-model="editForm.petId" filterable style="width: 100%">
            <el-option v-for="p in petOptionsForEdit" :key="p.id" :label="p.nickname" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务项目">
          <el-select v-model="editForm.serviceItemId" filterable style="width: 100%">
            <el-option v-for="s in serviceItemOptions" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="640px" destroy-on-close align-center>
      <div v-loading="detailLoading" class="detail-wrap">
        <template v-if="detailData && !detailLoading">
          <el-descriptions title="订单信息" :column="1" border class="mb">
            <el-descriptions-item label="订单号">{{ detailData.orderNo }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(detailData.status)" size="small">
                {{ detailData.statusDesc || statusOptions.find((x) => x.value === detailData.status)?.label }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="预约时间">{{ formatDateTime(detailData.serviceTime) }}</el-descriptions-item>
            <el-descriptions-item label="服务时长">
              {{ detailData.durationMinutes != null ? `${detailData.durationMinutes} 分钟` : '--' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="detailData.rating" label="评价">
              <el-rate :model-value="detailData.rating" disabled />
              <span v-if="detailData.comment" class="comment-text">{{ detailData.comment }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <template v-if="detailCustomer">
            <div class="sub-title">客户</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="姓名">{{ detailCustomer.name }}</el-descriptions-item>
              <el-descriptions-item label="手机">{{ detailCustomer.phone }}</el-descriptions-item>
            </el-descriptions>
          </template>

          <template v-if="detailPet">
            <div class="sub-title">宠物</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="昵称">{{ detailPet.nickname }}</el-descriptions-item>
              <el-descriptions-item label="品种">{{ detailPet.breed || '--' }}</el-descriptions-item>
            </el-descriptions>
          </template>

          <template v-if="detailService">
            <div class="sub-title">服务项目</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="名称">{{ detailService.name }}</el-descriptions-item>
              <el-descriptions-item label="价格">{{ formatMoney(detailService.price) }}</el-descriptions-item>
              <el-descriptions-item label="时长">
                {{ detailService.durationMinutes != null ? `${detailService.durationMinutes} 分钟` : '--' }}
              </el-descriptions-item>
            </el-descriptions>
          </template>

          <template v-if="detailEmp">
            <div class="sub-title">服务师</div>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="姓名">{{ detailEmp.name }}</el-descriptions-item>
              <el-descriptions-item label="手机">{{ detailEmp.phone || '--' }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </template>
      </div>
    </el-dialog>

    <!-- 评价 -->
    <el-dialog v-model="ratingVisible" title="订单评价" width="440px" destroy-on-close align-center @closed="ratingRow = null">
      <div v-if="ratingRow" class="rating-form">
        <div class="muted mb">订单 {{ ratingRow.orderNo }}</div>
        <el-form label-width="72px">
          <el-form-item label="星级">
            <el-rate v-model="ratingForm.rating" show-score />
          </el-form-item>
          <el-form-item label="评语">
            <el-input v-model="ratingForm.comment" type="textarea" :rows="4" maxlength="500" show-word-limit placeholder="选填" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="ratingVisible = false">取消</el-button>
        <el-button type="primary" :loading="ratingSubmitting" @click="submitRating">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.order-page {
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

.muted {
  color: #909399;
}

.mb {
  margin-bottom: 16px;
}

.sub-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f3a5f;
  margin: 16px 0 10px;
  padding-left: 8px;
  border-left: 3px solid #4f8ad9;
}

.detail-wrap {
  min-height: 120px;
}

.comment-text {
  display: block;
  margin-top: 8px;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
}

.rating-form .mb {
  margin-bottom: 12px;
}
</style>
