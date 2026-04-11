// 全局样式入口，作用于整个应用。
import './assets/main.css'

// Vue 应用初始化所需 API。
import { createApp } from 'vue'
// Element Plus 组件库及其默认样式。
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// Element Plus 中文语言包：让日期组件、分页组件等显示中文。
import zhCn from 'element-plus/es/locale/lang/zh-cn'
// 路由实例：用于根据 URL 渲染对应页面。
import router from './router'
// 管理系统的根组件。
import App from './App.vue'

// 创建应用实例，注册 Element Plus（中文）与路由，然后挂载到 #app。
createApp(App).use(ElementPlus, { locale: zhCn }).use(router).mount('#app')
