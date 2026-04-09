import axios, { AxiosRequestHeaders } from "axios";
import toast from "react-hot-toast";
//local storage keys
import { TOKEN_STORAGE_KEY, ACCOUNT_STORAGE_KEY } from "@/constants/config/enviroments";

const ApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_REST_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

const clearAuthStorage = () => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  } catch (e) {
    // localStorage may not be available during SSR
  }
};

ApiClient.interceptors.request.use(
  async (config: any) => {
    // Auth is cookie-based on the backend.
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

ApiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      clearAuthStorage();
      toast.error("Session expired, please login again");
      window.location.href = "/connect";
    }
    if (error.response && error.response.status === 402) {
      clearAuthStorage();
      toast.error("Authentication failed! Please login again");
      window.location.href = "/connect";
    }
    return Promise.reject(error);
  }
);

export default ApiClient;
