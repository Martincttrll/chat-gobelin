import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'

// Pas de menu au clic droit ni de zoom au pincement (Safari iOS ignore user-scalable=no).
document.addEventListener('contextmenu', (event) => event.preventDefault())
document.addEventListener('gesturestart', (event) => event.preventDefault())

const app = createApp(App)

app.use(createPinia())
app.use(router)

const userStore = useUserStore()
if (userStore.token) {
  userStore.fetchMe()
}

app.mount('#app')
