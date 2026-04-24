// 路由配置文件：
// 负责管理“地址路径”与“页面组件”的映射关系。
import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/api/request'
import HomePage from '@/pages/HomePage.vue'
import DeptManagePage from '@/pages/DeptManagePage.vue'
import EmpManagePage from '@/pages/EmpManagePage.vue'
import ScheduleManagePage from '@/pages/ScheduleManagePage.vue'
import LoginPage from '@/pages/LoginPage.vue'
import CustomerManagePage from '@/pages/CustomerManagePage.vue'
import PetManagePage from '@/pages/PetManagePage.vue'
import ServiceProjectManagePage from '@/pages/ServiceProjectManagePage.vue'
import OrderManagePage from '@/pages/OrderManagePage.vue'

// 路由表：
// - /login 登录页（无需 token）
// - /home、/department、/staff 需登录后访问
const routes = [
  { path: '/', redirect: '/home' },
  { path: '/login', name: 'login', component: LoginPage, meta: { public: true } },
  { path: '/home', name: 'home', component: HomePage, meta: { title: '首页' } },
  { path: '/department', name: 'department', component: DeptManagePage, meta: { title: '部门管理' } },
  { path: '/staff', name: 'staff', component: EmpManagePage, meta: { title: '员工管理' } },
  { path: '/schedule', name: 'schedule', component: ScheduleManagePage, meta: { title: '员工排班管理' } },
  { path: '/customers', name: 'customers', component: CustomerManagePage, meta: { title: '客户管理' } },
  { path: '/pets', name: 'pets', component: PetManagePage, meta: { title: '宠物管理' } },
  { path: '/service-projects', name: 'serviceProjects', component: ServiceProjectManagePage, meta: { title: '服务项目管理' } },
  { path: '/orders', name: 'orders', component: OrderManagePage, meta: { title: '订单管理' } }
]

// 创建路由实例。
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：未登录跳转登录页；已登录访问登录页则进首页。
router.beforeEach((to) => {
  const token = getToken()
  if (to.meta.public) {
    if (token) {
      return { path: '/home' }
    }
    return true
  }
  if (!token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
