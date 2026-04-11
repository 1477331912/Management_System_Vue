<script setup>
// 部门管理页面：
// 实现查询、新增、编辑、删除四个核心功能。
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { createDept, deleteDeptBatch, deleteDeptById, getDeptList, updateDept } from '@/api/dept'

// 列表加载状态与表格数据。
const loading = ref(false)
const deptList = ref([])

// 批量选择：已勾选部门 ID。
const selectedIds = ref([])

// 弹窗可见性：
// - addDialogVisible：新增部门弹窗
// - editDialogVisible：编辑部门弹窗
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)

// 新增表单模型。
const addFormRef = ref()
const addForm = reactive({
  name: ''
})

// 编辑表单模型。
const editFormRef = ref()
const editForm = reactive({
  id: undefined,
  name: ''
})

// 部门名称校验规则：
// 必填 + 长度 2~10。
const nameRules = [
  { required: true, message: '请输入部门名称', trigger: 'blur' },
  { min: 2, max: 10, message: '部门名称长度需在 2-10 个字符之间', trigger: 'blur' }
]

// 拉取部门列表。
async function fetchDeptList() {
  loading.value = true
  try {
    const list = await getDeptList()
    deptList.value = Array.isArray(list) ? list : []
  } catch (error) {
    ElMessage.error(error.message || '查询部门列表失败')
  } finally {
    loading.value = false
  }
}

// 打开新增弹窗前重置表单。
function openAddDialog() {
  addDialogVisible.value = true
  addForm.name = ''
}

// 提交新增。
async function submitAdd() {
  try {
    await addFormRef.value.validate()
    await createDept({ name: addForm.name.trim() })
    ElMessage.success('新增部门成功')
    addDialogVisible.value = false
    await fetchDeptList()
  } catch (error) {
    // 用户主动取消校验提示时不弹错，其他异常给出反馈。
    if (error?.message) {
      ElMessage.error(error.message)
    }
  }
}

// 打开编辑弹窗并回填数据。
function openEditDialog(row) {
  editForm.id = row.id
  editForm.name = row.name
  editDialogVisible.value = true
}

// 提交编辑。
async function submitEdit() {
  try {
    await editFormRef.value.validate()
    await updateDept({
      id: editForm.id,
      name: editForm.name.trim()
    })
    ElMessage.success('修改部门成功')
    editDialogVisible.value = false
    await fetchDeptList()
  } catch (error) {
    if (error?.message) {
      ElMessage.error(error.message)
    }
  }
}

// 表格多选变化。
function onSelectionChange(rows) {
  selectedIds.value = rows.map((item) => item.id)
}

// 批量删除（带确认框）。
async function onBatchDelete() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请先勾选要删除的部门')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认删除选中的 ${selectedIds.value.length} 个部门吗？删除后不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await deleteDeptBatch(selectedIds.value)
    ElMessage.success('批量删除成功')
    selectedIds.value = []
    await fetchDeptList()
  } catch (error) {
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message)
    }
  }
}

// 删除部门（带确认框）。
async function removeDept(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除部门“${row.name}”吗？删除后不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await deleteDeptById(row.id)
    ElMessage.success('删除部门成功')
    await fetchDeptList()
  } catch (error) {
    // cancel 表示用户取消，不应提示错误。
    if (error !== 'cancel' && error?.message) {
      ElMessage.error(error.message)
    }
  }
}

// 表格序号：从 1 开始显示。
function formatIndex(index) {
  return index + 1
}

// 时间格式化：把 2023-09-22T11:23:01 转成更易读格式。
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

// 为空时展示友好提示。
const isEmpty = computed(() => deptList.value.length === 0)

// 页面初始化时自动加载数据。
onMounted(() => {
  fetchDeptList()
})
</script>

<template>
  <div class="dept-page">
    <!-- 顶部工具栏：新增按钮。 -->
    <div class="toolbar">
      <el-button type="primary" @click="openAddDialog">+ 新增部门</el-button>
      <el-button type="danger" plain @click="onBatchDelete">
        <el-icon><Delete /></el-icon>
        批量删除
      </el-button>
    </div>

    <!-- 部门表格区域。 -->
    <el-table
      v-loading="loading"
      :data="deptList"
      border
      class="dept-table"
      empty-text="暂无部门数据"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="56" align="center" />
      <el-table-column label="序号" width="80" align="center">
        <template #default="{ $index }">
          {{ formatIndex($index) }}
        </template>
      </el-table-column>
      <el-table-column prop="name" label="部门名称" width="500" align="center" />
      <el-table-column label="最后操作时间" width="500" align="center">
        <template #default="{ row }">
          {{ formatDateTime(row.updateTime) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
          <el-button link type="danger" @click="removeDept(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 列表空态提示：加强页面可读性。 -->
    <div v-if="isEmpty && !loading" class="empty-tip">请点击“新增部门”开始创建数据</div>

    <!-- 新增部门弹窗。 -->
    <el-dialog v-model="addDialogVisible" title="新增部门" width="420px" destroy-on-close>
      <el-form ref="addFormRef" :model="addForm" :rules="{ name: nameRules }" label-width="86px">
        <el-form-item label="部门名称" prop="name">
          <el-input
            v-model="addForm.name"
            maxlength="10"
            show-word-limit
            placeholder="请输入 2-10 位部门名称"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAdd">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑部门弹窗。 -->
    <el-dialog v-model="editDialogVisible" title="编辑部门" width="420px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="{ name: nameRules }" label-width="86px">
        <el-form-item label="部门名称" prop="name">
          <el-input
            v-model="editForm.name"
            maxlength="10"
            show-word-limit
            placeholder="请输入 2-10 位部门名称"
            clearable
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 页面容器：确保内部布局纵向排列。 */
.dept-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 顶部按钮栏。 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 表格区域。 */
.dept-table {
  width: 100%;
}

/* 空状态文案。 */
.empty-tip {
  color: #909399;
  font-size: 13px;
  margin-top: -2px;
}
</style>

