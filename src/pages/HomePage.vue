<script setup>
// 首页（仪表盘）页面：
// 目标是“清晰且高级”——信息密度适中、层级明确、留白充足。
import { computed, ref } from 'vue'
import { Bell, Calendar, Document, RefreshRight, User } from '@element-plus/icons-vue'

// 统计数据（目前使用演示数据；后续可替换为接口返回）。
const kpis = ref([
  { label: '今日访问', value: 1280, trend: 0.12, icon: Calendar, color: '#4f8ad9' },
  { label: '待办事项', value: 7, trend: -0.05, icon: Document, color: '#6b8fbf' },
  { label: '在职员工', value: 86, trend: 0.03, icon: User, color: '#2f5486' },
  { label: '系统通知', value: 3, trend: 0.0, icon: Bell, color: '#1f3a5f' }
])

// 公告列表（演示数据）。
const notices = ref([
  { title: '本周五 18:00 系统维护', time: '2026-04-09 10:20' },
  { title: '新员工入职流程已更新', time: '2026-04-08 16:10' },
  { title: '请及时完善个人信息', time: '2026-04-07 09:30' }
])

// 最近操作（演示数据）。
const activities = ref([
  { operator: '张三', action: '更新了部门信息', time: '2026-04-09 09:12' },
  { operator: '李四', action: '新增员工：王五', time: '2026-04-08 18:02' },
  { operator: '张三', action: '导出员工列表', time: '2026-04-08 15:24' },
  { operator: '赵六', action: '修改权限配置', time: '2026-04-07 11:05' }
])

// 趋势展示文字（用于营造“仪表盘”观感；真实项目可换成图表）。
const trendText = computed(() => {
  const t = kpis.value?.[0]?.trend ?? 0
  const percent = Math.round(Math.abs(t) * 100)
  return t >= 0 ? `较昨日提升 ${percent}%` : `较昨日下降 ${percent}%`
})

// 刷新动作（目前只做演示反馈；后续可在此触发请求）。
const refreshing = ref(false)
async function handleRefresh() {
  refreshing.value = true
  // 这里用定时模拟请求耗时；真实项目可替换为 API 调用。
  await new Promise((r) => setTimeout(r, 600))
  refreshing.value = false
}
</script>

<template>
  <div class="home">
    <!-- 顶部信息区：左侧欢迎语，右侧快捷操作。 -->
    <div class="home-header">
      <div class="welcome">
        <div class="welcome-title">欢迎回来</div>
        <div class="welcome-subtitle">
          今天是一个适合高效处理事务的日子，先从待办与通知开始吧。
        </div>
      </div>

      <div class="actions">
        <el-button :loading="refreshing" type="primary" plain @click="handleRefresh">
          <el-icon><RefreshRight /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- KPI 区：4 个统计卡片，形成清晰的“总览层”。 -->
    <el-row :gutter="14" class="kpi-row">
      <el-col v-for="item in kpis" :key="item.label" :xs="24" :sm="12" :md="12" :lg="6">
        <el-card shadow="hover" class="kpi-card">
          <div class="kpi">
            <div class="kpi-left">
              <div class="kpi-label">{{ item.label }}</div>
              <div class="kpi-value">{{ item.value }}</div>
              <div class="kpi-trend" :class="{ down: item.trend < 0 }">
                {{ item.trend === 0 ? '与昨日持平' : (item.trend > 0 ? '上升' : '下降') }}
                <span v-if="item.trend !== 0">· {{ Math.round(Math.abs(item.trend) * 100) }}%</span>
              </div>
            </div>
            <div class="kpi-icon" :style="{ backgroundColor: item.color }">
              <el-icon size="20">
                <component :is="item.icon" />
              </el-icon>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 二级信息区：左公告、右最近操作，让首页更“像系统”。 -->
    <el-row :gutter="14" class="second-row">
      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="panel-title">
              <span>通知公告</span>
              <el-tag type="info" effect="plain">共 {{ notices.length }} 条</el-tag>
            </div>
          </template>

          <el-timeline class="notice-timeline">
            <el-timeline-item v-for="n in notices" :key="n.title + n.time" :timestamp="n.time">
              {{ n.title }}
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="panel-title">
              <span>最近操作</span>
              <span class="panel-sub">{{ trendText }}</span>
            </div>
          </template>

          <el-table :data="activities" height="260" stripe>
            <el-table-column prop="operator" label="操作人" width="120" />
            <el-table-column prop="action" label="动作" />
            <el-table-column prop="time" label="时间" width="170" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
/* 首页整体容器：保持“高级感”的关键是留白与对齐。 */
.home {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 顶部欢迎条：轻量信息 + 右侧操作按钮。 */
.home-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 2px 2px 6px;
}

.welcome-title {
  font-size: 18px;
  color: #1f2d3d;
  letter-spacing: 0.5px;
}

.welcome-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: #6b778c;
}

.kpi-row {
  margin-top: 2px;
}

/* KPI 卡片：干净、对比明确、图标统一。 */
.kpi-card :deep(.el-card__body) {
  padding: 14px;
}

.kpi {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.kpi-label {
  font-size: 13px;
  color: #6b778c;
}

.kpi-value {
  margin-top: 8px;
  font-size: 26px;
  font-weight: 700;
  color: #1f2d3d;
  letter-spacing: 0.5px;
}

.kpi-trend {
  margin-top: 6px;
  font-size: 12px;
  color: #2a7a4f;
}

.kpi-trend.down {
  color: #b42318;
}

.kpi-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(31, 58, 95, 0.18);
}

.second-row {
  margin-top: 2px;
}

.panel :deep(.el-card__header) {
  padding: 12px 14px;
}

.panel :deep(.el-card__body) {
  padding: 14px;
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.panel-sub {
  font-size: 12px;
  color: #6b778c;
}

.notice-timeline {
  margin-left: 6px;
}
</style>

