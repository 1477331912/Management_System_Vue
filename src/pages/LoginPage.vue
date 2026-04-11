<script setup>
// 登录页：单屏高级风格登录卡片，提交后调用 /login 并保存 token。
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login as loginApi } from '@/api/auth'

const router = useRouter()
const route = useRoute()

const formRef = ref()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[A-Za-z]{2,20}$/, message: '用户名为 2-20 位字母', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

// 取消：清空表单。
function onCancel() {
  form.username = ''
  form.password = ''
  formRef.value?.clearValidate()
}

// 登录：成功后跳转首页或 redirect 参数指定的地址。
async function onSubmit() {
  try {
    await formRef.value.validate()
    loading.value = true
    await loginApi(form.username.trim(), form.password)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/home'
    router.replace(redirect || '/home')
  } catch (error) {
    if (error?.message) {
      ElMessage.error(error.message)
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 背景装饰层：提升页面质感。 -->
    <div class="bg-orb orb-1" />
    <div class="bg-orb orb-2" />
    <div class="bg-grid" />

    <!-- 中央登录卡片。 -->
    <div class="login-center">
      <div class="login-card">
        <h1 class="login-title">管理系统</h1>
        <p class="login-subtitle">欢迎登录管理系统，请输入账号和密码</p>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="login-form">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入员工用户名" clearable autocomplete="username" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              show-password
              clearable
              autocomplete="current-password"
              @keyup.enter="onSubmit"
            />
          </el-form-item>

          <div class="login-actions">
            <el-button type="primary" :loading="loading" @click="onSubmit">登录</el-button>
            <el-button @click="onCancel">取消</el-button>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(145deg, #eef4ff 0%, #f8fbff 40%, #f2f6fc 100%);
}

/* 背景发光装饰块。 */
.bg-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(8px);
  z-index: 0;
}

.orb-1 {
  width: 420px;
  height: 420px;
  background: radial-gradient(circle at 30% 30%, rgba(79, 138, 217, 0.35), rgba(79, 138, 217, 0.02));
  left: -120px;
  top: -110px;
}

.orb-2 {
  width: 360px;
  height: 360px;
  background: radial-gradient(circle at 60% 40%, rgba(31, 58, 95, 0.24), rgba(31, 58, 95, 0.02));
  right: -80px;
  bottom: -90px;
}

/* 背景细网格，增加层次感。 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(31, 58, 95, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 58, 95, 0.05) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at center, black 35%, transparent 100%);
  z-index: 0;
}

.login-center {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 1;
}

.login-card {
  width: 100%;
  max-width: 430px;
  padding: 34px 30px 36px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  box-shadow:
    0 14px 36px rgba(31, 58, 95, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(216, 226, 240, 0.9);
}

.login-title {
  margin: 0 0 8px;
  font-size: 30px;
  font-weight: 600;
  color: #1f2d3d;
  text-align: center;
  font-family: KaiTi, STKaiti, 'KaiTi_GB2312', serif;
}

.login-subtitle {
  margin: 0 0 20px;
  text-align: center;
  color: #6b778c;
  font-size: 13px;
}

.login-form :deep(.el-form-item__label) {
  font-weight: 500;
}

.login-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.login-actions .el-button {
  flex: 1;
}
</style>
