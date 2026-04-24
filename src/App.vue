<script setup>
// 引入 Vue 组合式 API，用于页面标题计算。
import { computed, ref, watch } from 'vue'
// 引入路由能力：用于读取当前路径并驱动菜单高亮与内容切换。
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
// 引入 Element Plus 图标组件：用于菜单项前的图标展示。
import {
  Avatar,
  Bowl,
  Calendar,
  HomeFilled,
  OfficeBuilding,
  Service,
  Setting,
  ShoppingBag,
  SwitchButton,
  UserFilled
} from '@element-plus/icons-vue'
import { getStoredUser, logout as logoutAuth } from '@/api/auth'

// 当前登录用户姓名（登录成功后从本地缓存读取）。
const employeeName = ref('张三')
// 当前路由对象。
const route = useRoute()
const router = useRouter()

// 路由变化时同步展示姓名（例如从登录页进入系统后）。
watch(
  () => route.fullPath,
  () => {
    employeeName.value = getStoredUser()?.name || '张三'
  },
  { immediate: true }
)

// 根据路由 meta.title 显示右侧区域标题。
const pageTitle = computed(() => route.meta?.title || '首页')

// 退出登录：先弹确认框，确认后清除登录态并回到登录页。
async function onLogout() {
  try {
    await ElMessageBox.confirm(
      '是否确认退出登录',
      '退出提示',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    logoutAuth()
    router.push('/login')
  } catch {
    // 点击取消时不做任何处理。
  }
}
</script>

<template>
  <!-- 登录页全屏展示，不使用后台框架布局 -->
  <router-view v-if="route.path === '/login'" />

  <el-container v-else class="app-layout">
    <!-- 顶部区域：左侧系统标题，右侧退出登录。 -->
    <el-header class="top-header">
      <h1 class="system-title">管理系统</h1>
      <a href="javascript:void(0)" class="logout-link" @click.prevent="onLogout">
        <el-icon><SwitchButton /></el-icon>
        <span>退出登录【{{ employeeName }}】</span>
      </a>
    </el-header>

    <el-container>
      <!-- 左侧菜单区域：系统功能导航入口。 -->
      <el-aside width="220px" class="side-menu">
        <!-- 使用路由模式：点击菜单时自动更新 URL 并切换页面。 -->
        <el-menu :default-active="route.path" router>
          <!-- 首页：使用“房子”图标，符合主页语义。 -->
          <el-menu-item index="/home">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-sub-menu index="sys-info">
            <template #title>
              <!-- 系统信息管理：使用“设置”图标，表示系统配置/信息维护。 -->
              <el-icon><Setting /></el-icon>
              <span>系统信息管理</span>
            </template>
            <!-- 部门管理：使用“办公楼”图标，表达组织/部门概念。 -->
            <el-menu-item index="/department">
              <el-icon><OfficeBuilding /></el-icon>
              <span>部门管理</span>
            </el-menu-item>
            <!-- 员工管理：使用“用户”图标，表达人员/账号管理。 -->
            <el-menu-item index="/staff">
              <el-icon><UserFilled /></el-icon>
              <span>员工管理</span>
            </el-menu-item>
            <el-menu-item index="/schedule">
              <el-icon><Calendar /></el-icon>
              <span>员工排班管理</span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 与「系统信息管理」同级：门店业务模块。 -->
          <el-menu-item index="/customers">
            <el-icon><Avatar /></el-icon>
            <span>客户管理</span>
          </el-menu-item>
          <el-menu-item index="/pets">
            <el-icon><Bowl /></el-icon>
            <span>宠物管理</span>
          </el-menu-item>
          <el-menu-item index="/service-projects">
            <el-icon><Service /></el-icon>
            <span>服务项目管理</span>
          </el-menu-item>
          <el-menu-item index="/orders">
            <el-icon><ShoppingBag /></el-icon>
            <span>订单管理</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 右侧主内容区域：根据菜单项切换不同页面内容。 -->
      <el-main class="main-content">
        <el-card shadow="never" class="content-card">
          <template #header>
            <span>{{ pageTitle }}</span>
          </template>
          <!-- 由路由决定主内容：地址变化时自动切换对应页面。 -->
          <router-view />
        </el-card>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
/* 系统配色变量：统一顶部与侧边栏视觉风格。 */
.app-layout {
  --sys-primary: #1f3a5f;
  --sys-primary-light: #2f5486;
  --sys-accent: #4f8ad9;
  --sys-aside-bg: #f5f8fc;
  --sys-aside-text: #2f3b52;
  --sys-aside-active-bg: #e6eefb;
  --sys-aside-hover-bg: #edf3fd;
  --sys-border: #d8e2f0;
}

/* 页面级容器：保证管理系统布局占满视口高度。 */
.app-layout {
  min-height: 100vh;
}

/* 顶部栏样式：按原型设置背景、边框和左右布局。 */
.top-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;
  background: linear-gradient(90deg, var(--sys-primary), var(--sys-primary-light));
  border-bottom: 1px solid var(--sys-border);
  padding: 0 20px;
}

/* 系统标题样式：楷体、30px、左对齐。 */
.system-title {
  margin: 0;
  font-size: 30px;
  font-family: KaiTi, STKaiti, 'KaiTi_GB2312', serif;
  text-align: left;
  color: #ffffff;
  letter-spacing: 1px;
}

/* 右上角退出登录链接样式。 */
.logout-link {
  color: #dce9ff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.logout-link:hover {
  color: #ffffff;
}

/* 左侧菜单容器样式。 */
.side-menu {
  border-right: 1px solid var(--sys-border);
  background: var(--sys-aside-bg);
}

/* 移除菜单自带右边框，并让菜单高度填满可视区域。 */
.side-menu :deep(.el-menu) {
  border-right: none;
  min-height: calc(100vh - 70px);
  background: var(--sys-aside-bg);
}

/* 一级菜单与子菜单标题文字颜色。 */
.side-menu :deep(.el-menu-item),
.side-menu :deep(.el-sub-menu__title) {
  color: var(--sys-aside-text);
}

/* 菜单悬浮高亮样式。 */
.side-menu :deep(.el-menu-item:hover),
.side-menu :deep(.el-sub-menu__title:hover) {
  background-color: var(--sys-aside-hover-bg);
  color: var(--sys-primary);
}

/* 当前激活菜单的背景与强调色。 */
.side-menu :deep(.el-menu-item.is-active) {
  background-color: var(--sys-aside-active-bg);
  color: var(--sys-accent);
  font-weight: 600;
}

/* 右侧主内容区样式。 */
.main-content {
  background: #ffffff;
  padding: 16px;
}

/* 内容卡片最小高度，保持页面骨架完整。 */
.content-card {
  min-height: calc(100vh - 102px);
}

</style>
