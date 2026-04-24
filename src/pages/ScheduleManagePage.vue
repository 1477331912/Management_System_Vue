<script setup>
// 员工排班管理：分页查询、日历看板、新增、编辑、删除。
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getDeptList } from '@/api/dept'
import { getEmpListAll } from '@/api/emp'
import {
  createSchedule,
  deleteSchedule,
  getScheduleCalendar,
  getScheduleDetail,
  getScheduleEmpOptions,
  getSchedulePage,
  getScheduleTypes,
  updateSchedule
} from '@/api/schedule'

const fallbackScheduleTypes = [
  { value: 1, label: '可预约' },
  { value: 2, label: '休息' },
  { value: 3, label: '请假' },
  { value: 4, label: '锁定' },
  { value: 5, label: '已被预约' }
]

const queryForm = reactive({
  workDateRange: [],
  deptId: '',
  empId: '',
  scheduleType: ''
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const deptOptions = ref([])
const empOptions = ref([])
const scheduleTypes = ref([...fallbackScheduleTypes])
const dialogEmpOptions = ref([])
const dialogDeptId = ref('')

const dialogVisible = ref(false)
const editMode = ref('create')
const formRef = ref()
const submitLoading = ref(false)

const scheduleForm = reactive({
  id: undefined,
  empId: undefined,
  workDate: '',
  startTime: '',
  endTime: '',
  scheduleType: 1,
  maxAppointments: 0,
  remark: ''
})

const formRules = {
  empId: [{ required: true, message: '请选择员工', trigger: 'change' }],
  workDate: [{ required: true, message: '请选择排班日期', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  scheduleType: [{ required: true, message: '请选择排班类型', trigger: 'change' }]
}

const calendarDate = ref('')
const calendarLoading = ref(false)
const calendarRows = ref([])

function scheduleTypeText(type) {
  const found = scheduleTypes.value.find((item) => Number(item.value) === Number(type))
  return found?.label || '--'
}

function scheduleTypeTag(type) {
  if (Number(type) === 1) return 'success'
  if (Number(type) === 2) return 'info'
  if (Number(type) === 3) return 'warning'
  if (Number(type) === 4) return 'danger'
  if (Number(type) === 5) return 'primary'
  return 'info'
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

function normalizeDateTime(value) {
  // 统一转 yyyy-MM-dd HH:mm:ss，避免浏览器和后端格式差异。
  return formatDateTime(value).replace('T', ' ')
}

function extractTime(value) {
  if (!value) return ''
  const text = String(value).replace('T', ' ')
  return text.length >= 19 ? text.slice(11, 19) : text
}

function composeDateTime(workDate, timeValue) {
  if (!workDate || !timeValue) return ''
  return `${workDate} ${timeValue}`
}

function buildQueryParams() {
  const [workDateBegin, workDateEnd] = queryForm.workDateRange || []
  return {
    workDateBegin: workDateBegin || undefined,
    workDateEnd: workDateEnd || undefined,
    deptId: queryForm.deptId || undefined,
    empId: queryForm.empId || undefined,
    scheduleType: queryForm.scheduleType || undefined,
    page: page.value,
    pageSize: pageSize.value
  }
}

async function loadBaseOptions() {
  try {
    const [depts, emps, types] = await Promise.all([getDeptList(), getEmpListAll(), getScheduleTypes()])
    deptOptions.value = Array.isArray(depts) ? depts : []
    empOptions.value = Array.isArray(emps) ? emps : []
    if (types.length) {
      scheduleTypes.value = types
    }
  } catch (error) {
    ElMessage.error(error.message || '加载基础数据失败')
  }
}

async function fetchDialogEmpOptions(deptId) {
  try {
    const list = await getScheduleEmpOptions(deptId || undefined)
    dialogEmpOptions.value = list.map((item) => ({
      id: item.empId,
      name: item.empName,
      deptId: item.deptId,
      deptName: item.deptName
    }))
  } catch (error) {
    ElMessage.error(error.message || '加载员工下拉失败')
  }
}

async function fetchTableData() {
  loading.value = true
  try {
    const result = await getSchedulePage(buildQueryParams())
    tableData.value = Array.isArray(result.rows) ? result.rows : []
    total.value = Number(result.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '查询排班失败')
  } finally {
    loading.value = false
  }
}

async function fetchCalendarData() {
  if (!calendarDate.value) {
    calendarRows.value = []
    return
  }
  calendarLoading.value = true
  try {
    const rows = await getScheduleCalendar({
      workDate: calendarDate.value,
      deptId: queryForm.deptId || undefined,
      empId: queryForm.empId || undefined
    })
    calendarRows.value = rows
  } catch (error) {
    ElMessage.error(error.message || '加载排班看板失败')
  } finally {
    calendarLoading.value = false
  }
}

async function onSearch() {
  page.value = 1
  await fetchTableData()
  await fetchCalendarData()
}

async function onReset() {
  queryForm.workDateRange = []
  queryForm.deptId = ''
  queryForm.empId = ''
  queryForm.scheduleType = ''
  page.value = 1
  await fetchTableData()
  await fetchCalendarData()
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

function resetScheduleForm() {
  scheduleForm.id = undefined
  scheduleForm.empId = undefined
  scheduleForm.workDate = ''
  scheduleForm.startTime = ''
  scheduleForm.endTime = ''
  scheduleForm.scheduleType = 1
  scheduleForm.maxAppointments = 0
  scheduleForm.remark = ''
  dialogDeptId.value = ''
  dialogEmpOptions.value = []
}

function openCreateDialog() {
  editMode.value = 'create'
  resetScheduleForm()
  fetchDialogEmpOptions(undefined)
  dialogVisible.value = true
}

async function openEditDialog(row) {
  editMode.value = 'edit'
  resetScheduleForm()
  try {
    const detail = await getScheduleDetail(row.id)
    scheduleForm.id = detail.id
    scheduleForm.empId = detail.empId
    scheduleForm.workDate = detail.workDate || ''
    scheduleForm.startTime = extractTime(normalizeDateTime(detail.startTime || ''))
    scheduleForm.endTime = extractTime(normalizeDateTime(detail.endTime || ''))
    scheduleForm.scheduleType = detail.scheduleType ?? 1
    scheduleForm.maxAppointments = Number(detail.maxAppointments ?? 0)
    scheduleForm.remark = detail.remark || ''
    dialogDeptId.value = detail.deptId || ''
    await fetchDialogEmpOptions(dialogDeptId.value || undefined)
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '获取排班详情失败')
  }
}

watch(dialogDeptId, async (val) => {
  if (!dialogVisible.value) return
  const selectedEmpId = scheduleForm.empId
  await fetchDialogEmpOptions(val || undefined)
  const stillExists = dialogEmpOptions.value.some((item) => item.id === selectedEmpId)
  if (!stillExists) {
    scheduleForm.empId = undefined
  }
})

watch(
  () => scheduleForm.scheduleType,
  (v) => {
    if (v !== 1) {
      scheduleForm.maxAppointments = 0
    }
  }
)

function validateTimeRange() {
  const startDateTime = composeDateTime(scheduleForm.workDate, scheduleForm.startTime)
  const endDateTime = composeDateTime(scheduleForm.workDate, scheduleForm.endTime)
  const start = new Date(startDateTime)
  const end = new Date(endDateTime)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    ElMessage.warning('请选择有效的开始/结束时间')
    return false
  }
  if (start >= end) {
    ElMessage.warning('排班开始时间必须早于结束时间')
    return false
  }
  return true
}

function buildSubmitPayload() {
  const payload = {
    empId: scheduleForm.empId,
    workDate: scheduleForm.workDate,
    startTime: composeDateTime(scheduleForm.workDate, scheduleForm.startTime),
    endTime: composeDateTime(scheduleForm.workDate, scheduleForm.endTime),
    scheduleType: scheduleForm.scheduleType,
    maxAppointments: scheduleForm.scheduleType === 1 ? Number(scheduleForm.maxAppointments || 0) : 0,
    remark: scheduleForm.remark?.trim() || undefined
  }
  if (editMode.value === 'edit') {
    payload.id = scheduleForm.id
  }
  return payload
}

async function onSubmit() {
  try {
    await formRef.value.validate()
    if (!validateTimeRange()) return
    submitLoading.value = true
    const payload = buildSubmitPayload()
    if (editMode.value === 'create') {
      await createSchedule(payload)
      ElMessage.success('新增排班成功')
    } else {
      await updateSchedule(payload)
      ElMessage.success('修改排班成功')
    }
    dialogVisible.value = false
    await fetchTableData()
    await fetchCalendarData()
  } catch (error) {
    if (error?.message) {
      ElMessage.error(error.message)
    }
  } finally {
    submitLoading.value = false
  }
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除 ${row.workDate} ${row.empName || ''} 的该条排班吗？`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
    await deleteSchedule(row.id)
    ElMessage.success('删除成功')
    await fetchTableData()
    await fetchCalendarData()
  } catch (error) {
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message)
    }
  }
}

const dialogTitle = computed(() => (editMode.value === 'create' ? '新增排班' : '编辑排班'))

onMounted(async () => {
  const today = new Date()
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  calendarDate.value = `${y}-${m}-${d}`

  await loadBaseOptions()
  await fetchTableData()
  await fetchCalendarData()
})
</script>

<template>
  <div class="schedule-page">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryForm">
        <el-form-item label="排班日期">
          <el-date-picker
            v-model="queryForm.workDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            clearable
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="queryForm.deptId" clearable filterable placeholder="全部" style="width: 150px">
            <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="员工">
          <el-select v-model="queryForm.empId" clearable filterable placeholder="全部" style="width: 160px">
            <el-option v-for="e in empOptions" :key="e.id" :label="e.name" :value="e.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="排班类型">
          <el-select v-model="queryForm.scheduleType" clearable placeholder="全部" style="width: 140px">
            <el-option v-for="t in scheduleTypes" :key="t.value" :label="t.label" :value="t.value" />
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
        新增排班
      </el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe class="schedule-table" empty-text="暂无排班数据">
      <el-table-column prop="workDate" label="排班日期" width="120" align="center" />
      <el-table-column label="班次时间" min-width="190" align="center">
        <template #default="{ row }">
          {{ formatDateTime(row.startTime) }} ~ {{ formatDateTime(row.endTime) }}
        </template>
      </el-table-column>
      <el-table-column prop="deptName" label="部门" min-width="110" align="center" />
      <el-table-column prop="empName" label="员工" min-width="110" align="center" />
      <el-table-column label="排班类型" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="scheduleTypeTag(row.scheduleType)" effect="plain" size="small">
            {{ scheduleTypeText(row.scheduleType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="maxAppointments" label="最大预约数" width="110" align="center" />
      <el-table-column prop="remark" label="备注" min-width="140" align="center" show-overflow-tooltip />
      <el-table-column label="更新时间" min-width="170" align="center">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" min-width="150" align="center" fixed="right">
        <template #default="{ row }">
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

    <el-card shadow="never" class="calendar-card">
      <template #header>
        <div class="calendar-header">
          <span>当日排班看板</span>
          <div class="calendar-filters">
            <el-date-picker v-model="calendarDate" type="date" value-format="YYYY-MM-DD" @change="fetchCalendarData" />
            <el-button @click="fetchCalendarData">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="calendarLoading"
        :data="calendarRows"
        border
        stripe
        size="small"
        empty-text="当日暂无排班"
      >
        <el-table-column prop="deptName" label="部门" min-width="100" align="center" />
        <el-table-column prop="empName" label="员工" min-width="100" align="center" />
        <el-table-column label="班次" min-width="180" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }} ~ {{ formatDateTime(row.endTime) }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="96" align="center">
          <template #default="{ row }">
            <el-tag :type="scheduleTypeTag(row.scheduleType)" effect="plain" size="small">
              {{ scheduleTypeText(row.scheduleType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="maxAppointments" label="预约上限" width="90" align="center" />
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="620px" destroy-on-close align-center>
      <el-form ref="formRef" :model="scheduleForm" :rules="formRules" label-width="100px" class="schedule-form">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="员工部门">
              <el-select v-model="dialogDeptId" clearable filterable placeholder="全部部门" style="width: 100%">
                <el-option v-for="d in deptOptions" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="员工" prop="empId">
              <el-select v-model="scheduleForm.empId" filterable placeholder="请选择员工" style="width: 100%">
                <el-option v-for="e in dialogEmpOptions" :key="e.id" :label="e.name" :value="e.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="排班日期" prop="workDate">
              <el-date-picker
                v-model="scheduleForm.workDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="开始时间" prop="startTime">
              <el-time-picker
                v-model="scheduleForm.startTime"
                value-format="HH:mm:ss"
                format="HH:mm:ss"
                placeholder="请选择开始时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束时间" prop="endTime">
              <el-time-picker
                v-model="scheduleForm.endTime"
                value-format="HH:mm:ss"
                format="HH:mm:ss"
                placeholder="请选择结束时间"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="排班类型" prop="scheduleType">
              <el-select v-model="scheduleForm.scheduleType" placeholder="请选择" style="width: 100%">
                <el-option v-for="t in scheduleTypes" :key="t.value" :label="t.label" :value="t.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最大预约数">
              <el-input-number
                v-model="scheduleForm.maxAppointments"
                :min="0"
                :precision="0"
                :disabled="scheduleForm.scheduleType !== 1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="scheduleForm.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.schedule-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-card :deep(.el-card__body) {
  padding-bottom: 4px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.schedule-table {
  width: 100%;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.calendar-card {
  margin-top: 2px;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.calendar-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.schedule-form {
  padding-right: 8px;
}
</style>
