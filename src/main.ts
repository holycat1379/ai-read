import { createApp } from 'vue'
import naive from 'naive-ui'
import './style.css'
import App from './App.vue'
import 'virtual:uno.css'
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)
app.use(naive)
app.mount('#app')
registerSW({
    immediate: true
  })