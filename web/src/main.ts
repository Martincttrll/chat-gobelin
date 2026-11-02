import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const userStore = useUserStore()
if (userStore.token) {
  userStore.fetchMe()
}

app.mount('#app')
