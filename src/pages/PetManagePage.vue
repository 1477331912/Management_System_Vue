<script setup>
// 宠物管理：分页查询、详情、新增、编辑、删除；关联客户下拉。
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getCustomerPage } from '@/api/customer'
import { createPet, deletePet, getPetDetail, getPetPage, updatePet } from '@/api/pet'
import { uploadFile } from '@/api/upload'

const genderOptions = [
  { label: '公', value: 1 },
  { label: '母', value: 2 }
]

const vaccineOptions = [
  { label: '未接种', value: 0 },
  { label: '已接种', value: 1 }
]

const memberLevelLabels = { 1: '普通', 2: '白银', 3: '黄金', 4: '钻石' }

const queryForm = reactive({
  nickname: '',
  breed: '',
  vaccineStatus: '',
  customerId: ''
})

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const customerOptions = ref([])

const dialogVisible = ref(false)
const editMode = ref('create')
const formRef = ref()
const submitLoading = ref(false)
const imageUploading = ref(false)

const petForm = reactive({
  id: undefined,
  nickname: '',
  breed: '',
  gender: 1,
  birthday: '',
  weight: undefined,
  vaccineStatus: 0,
  allergyHistory: '',
  image: '',
  customerId: undefined
})

const formRules = {
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  breed: [{ required: true, message: '请输入品种', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  customerId: [{ required: true, message: '请选择所属客户', trigger: 'change' }]
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)

function genderText(g) {
  return g === 1 ? '公' : g === 2 ? '母' : '--'
}

function vaccineText(v) {
  return v === 1 ? '已接种' : '未接种'
}

function memberLevelText(level) {
  return memberLevelLabels[level] || '--'
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
    nickname: queryForm.nickname.trim() || undefined,
    breed: queryForm.breed.trim() || undefined,
    vaccineStatus: queryForm.vaccineStatus === '' ? undefined : queryForm.vaccineStatus,
    customerId: queryForm.customerId === '' ? undefined : queryForm.customerId,
    page: page.value,
    pageSize: pageSize.value
  }
}

async function fetchCustomerOptions() {
  try {
    const res = await getCustomerPage({ page: 1, pageSize: 500 })
    customerOptions.value = Array.isArray(res.rows) ? res.rows : []
  } catch (error) {
    ElMessage.error(error.message || '加载客户列表失败')
  }
}

async function fetchTableData() {
  loading.value = true
  try {
    const result = await getPetPage(buildQueryParams())
    tableData.value = Array.isArray(result.rows) ? result.rows : []
    total.value = Number(result.total || 0)
  } catch (error) {
    ElMessage.error(error.message || '查询宠物失败')
  } finally {
    loading.value = false
  }
}

async function onSearch() {
  page.value = 1
  await fetchTableData()
}

async function onReset() {
  queryForm.nickname = ''
  queryForm.breed = ''
  queryForm.vaccineStatus = ''
  queryForm.customerId = ''
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

function resetPetForm() {
  petForm.id = undefined
  petForm.nickname = ''
  petForm.breed = ''
  petForm.gender = 1
  petForm.birthday = ''
  petForm.weight = undefined
  petForm.vaccineStatus = 0
  petForm.allergyHistory = ''
  petForm.image = ''
  petForm.customerId = undefined
}

function openCreateDialog() {
  editMode.value = 'create'
  resetPetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  editMode.value = 'edit'
  petForm.id = row.id
  petForm.nickname = row.nickname || ''
  petForm.breed = row.breed || ''
  petForm.gender = row.gender ?? 1
  petForm.birthday = row.birthday || ''
  petForm.weight = row.weight
  petForm.vaccineStatus = row.vaccineStatus ?? 0
  petForm.allergyHistory = row.allergyHistory || ''
  petForm.image = row.image || ''
  petForm.customerId = row.customerId
  dialogVisible.value = true
}

async function openDetailDialog(row) {
  detailVisible.value = true
  detailData.value = null
  detailLoading.value = true
  try {
    detailData.value = await getPetDetail(row.id)
  } catch (error) {
    ElMessage.error(error.message || '加载详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function beforeImageUpload(file) {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.warning('请上传图片文件')
    return false
  }
  if (file.size / 1024 / 1024 >= 5) {
    ElMessage.warning('图片大小不能超过 5MB')
    return false
  }
  return true
}

async function onImageUploadRequest(option) {
  try {
    imageUploading.value = true
    const url = await uploadFile(option.file)
    petForm.image = url
    option.onSuccess?.(url)
    ElMessage.success('图片上传成功')
  } catch (error) {
    option.onError?.(error)
    ElMessage.error(error.message || '上传失败')
  } finally {
    imageUploading.value = false
  }
}

function clearPetImage() {
  petForm.image = ''
}

function buildSubmitPayload() {
  const payload = {
    nickname: petForm.nickname.trim(),
    breed: petForm.breed.trim(),
    gender: petForm.gender,
    birthday: petForm.birthday || undefined,
    weight: petForm.weight === undefined || petForm.weight === null ? undefined : Number(petForm.weight),
    vaccineStatus: petForm.vaccineStatus ?? 0,
    allergyHistory: petForm.allergyHistory?.trim() || undefined,
    image: petForm.image?.trim() || undefined,
    customerId: petForm.customerId
  }
  if (editMode.value === 'edit') {
    payload.id = petForm.id
  }
  return payload
}

async function onSubmit() {
  try {
    await formRef.value.validate()
    submitLoading.value = true
    const payload = buildSubmitPayload()
    if (editMode.value === 'create') {
      await createPet(payload)
      ElMessage.success('新增宠物成功')
    } else {
      await updatePet(payload)
      ElMessage.success('修改宠物成功')
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
      `确认删除宠物「${row.nickname}」吗？若存在未完成订单可能无法删除。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    )
    await deletePet(row.id)
    ElMessage.success('删除成功')
    await fetchTableData()
  } catch (error) {
    if (error !== 'cancel' && error?.message) ElMessage.error(error.message)
  }
}

const dialogTitle = computed(() => (editMode.value === 'create' ? '新增宠物' : '编辑宠物'))

onMounted(async () => {
  await fetchCustomerOptions()
  await fetchTableData()
})
</script>

<template>
  <div class="pet-page">
    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" :model="queryForm" class="filter-form">
        <el-form-item label="昵称">
          <el-input v-model="queryForm.nickname" placeholder="模糊查询" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="品种">
          <el-input v-model="queryForm.breed" placeholder="精确查询" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="疫苗">
          <el-select v-model="queryForm.vaccineStatus" placeholder="全部" clearable style="width: 110px">
            <el-option v-for="opt in vaccineOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属客户">
          <el-select
            v-model="queryForm.customerId"
            placeholder="全部"
            clearable
            filterable
            style="width: 180px"
          >
            <el-option
              v-for="c in customerOptions"
              :key="c.id"
              :label="`${c.name} (${c.phone})`"
              :value="c.id"
            />
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
        新增宠物
      </el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="tableData"
      border
      stripe
      class="data-table"
      empty-text="暂无宠物数据"
    >
      <el-table-column label="照片" width="76" align="center">
        <template #default="{ row }">
          <el-avatar :size="40" :src="resolveImageUrl(row.image)" shape="square">
            {{ row.nickname?.slice(0, 1) || '宠' }}
          </el-avatar>
        </template>
      </el-table-column>
      <el-table-column prop="nickname" label="昵称" min-width="100" align="center" show-overflow-tooltip />
      <el-table-column prop="breed" label="品种" min-width="90" align="center" />
      <el-table-column label="性别" width="72" align="center">
        <template #default="{ row }">{{ genderText(row.gender) }}</template>
      </el-table-column>
      <el-table-column prop="birthday" label="生日" width="120" align="center" />
      <el-table-column label="体重(kg)" width="96" align="center">
        <template #default="{ row }">{{ row.weight != null ? row.weight : '--' }}</template>
      </el-table-column>
      <el-table-column label="疫苗" width="88" align="center">
        <template #default="{ row }">
          <el-tag :type="row.vaccineStatus === 1 ? 'success' : 'info'" size="small" effect="plain">
            {{ vaccineText(row.vaccineStatus) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="所属客户" min-width="100" align="center" show-overflow-tooltip />
      <el-table-column label="最后修改" min-width="160" align="center">
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
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close align-center>
      <el-form ref="formRef" :model="petForm" :rules="formRules" label-width="100px" class="dialog-form">
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="petForm.nickname" maxlength="32" show-word-limit placeholder="宠物昵称" />
        </el-form-item>
        <el-form-item label="品种" prop="breed">
          <el-input v-model="petForm.breed" maxlength="32" placeholder="如：金毛、柯基" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-select v-model="petForm.gender" style="width: 100%">
                <el-option v-for="g in genderOptions" :key="g.value" :label="g.label" :value="g.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属客户" prop="customerId">
              <el-select v-model="petForm.customerId" filterable placeholder="请选择客户" style="width: 100%">
                <el-option
                  v-for="c in customerOptions"
                  :key="c.id"
                  :label="`${c.name} · ${c.phone}`"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="生日">
              <el-date-picker
                v-model="petForm.birthday"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选填"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="体重(kg)">
              <el-input-number v-model="petForm.weight" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="疫苗状态">
              <el-select v-model="petForm.vaccineStatus" style="width: 100%">
                <el-option v-for="v in vaccineOptions" :key="v.value" :label="v.label" :value="v.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="过敏史">
          <el-input v-model="petForm.allergyHistory" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="照片">
          <div class="image-upload-row">
            <el-upload
              class="pet-uploader"
              :show-file-list="false"
              :http-request="onImageUploadRequest"
              :before-upload="beforeImageUpload"
              accept="image/*"
            >
              <img v-if="petForm.image" :src="resolveImageUrl(petForm.image)" alt="" class="pet-preview" />
              <el-icon v-else class="pet-uploader-icon"><Plus /></el-icon>
            </el-upload>
            <div class="image-upload-meta">
              <span v-if="imageUploading">上传中…</span>
              <span v-else>jpg/png，≤5MB</span>
              <el-button v-if="petForm.image" link type="danger" @click="clearPetImage">移除</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="detailVisible" title="宠物详情" width="640px" destroy-on-close align-center class="detail-dialog">
      <div v-loading="detailLoading" class="detail-body">
        <template v-if="detailData && !detailLoading">
          <div class="detail-section">
            <div class="section-title">宠物信息</div>
            <div class="detail-head">
              <el-avatar :size="72" :src="resolveImageUrl(detailData.image)" shape="square">
                {{ detailData.nickname?.slice(0, 1) || '宠' }}
              </el-avatar>
              <el-descriptions :column="2" border class="detail-desc">
                <el-descriptions-item label="昵称">{{ detailData.nickname || '--' }}</el-descriptions-item>
                <el-descriptions-item label="品种">{{ detailData.breed || '--' }}</el-descriptions-item>
                <el-descriptions-item label="性别">{{ genderText(detailData.gender) }}</el-descriptions-item>
                <el-descriptions-item label="生日">{{ detailData.birthday || '--' }}</el-descriptions-item>
                <el-descriptions-item label="体重(kg)">
                  {{ detailData.weight != null ? detailData.weight : '--' }}
                </el-descriptions-item>
                <el-descriptions-item label="疫苗">
                  <el-tag :type="detailData.vaccineStatus === 1 ? 'success' : 'info'" size="small">
                    {{ vaccineText(detailData.vaccineStatus) }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="过敏史" :span="2">{{ detailData.allergyHistory || '--' }}</el-descriptions-item>
                <el-descriptions-item label="最后修改" :span="2">{{ formatDateTime(detailData.updateTime) }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </div>

          <div v-if="detailData.customer" class="detail-section">
            <div class="section-title">所属客户</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="姓名">{{ detailData.customer.name || '--' }}</el-descriptions-item>
              <el-descriptions-item label="手机">{{ detailData.customer.phone || '--' }}</el-descriptions-item>
              <el-descriptions-item label="会员等级">
                {{ memberLevelText(detailData.customer.memberLevel) }}
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.pet-page {
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
  padding-right: 4px;
}

.image-upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pet-uploader :deep(.el-upload) {
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  background: #fafafa;
}

.pet-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.pet-uploader-icon {
  font-size: 24px;
  color: #8c939d;
}

.pet-preview {
  width: 88px;
  height: 88px;
  object-fit: cover;
  display: block;
}

.image-upload-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.detail-body {
  min-height: 100px;
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

.detail-head {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.detail-desc {
  flex: 1;
  min-width: 0;
}

.detail-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}
</style>
