import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/user";
import HomeView from "@/views/HomeView.vue";
import LoginView from "@/views/LoginView.vue";
import ChannelView from "@/views/ChannelView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/login", name: "login", component: LoginView },
    { path: "/channel/:name", name: "channel", component: ChannelView },
  ],
});

router.beforeEach((to) => {
  const userStore = useUserStore();

  if (to.name !== "login" && !userStore.token) {
    return { name: "login" };
  }
  if (to.name === "login" && userStore.token) {
    return { name: "home" };
  }
});

export default router;
