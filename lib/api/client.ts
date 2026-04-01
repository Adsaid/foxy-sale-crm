import axios from "axios";

const api = axios.create({
  baseURL: "",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const activeTeamId = window.localStorage.getItem("activeTeamId");
    if (activeTeamId) {
      config.headers["x-team-id"] = activeTeamId;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    /** 403 (наприклад непідтверджений акаунт) — не скидаємо сесію примусово. */
    return Promise.reject(error);
  }
);

export default api;
