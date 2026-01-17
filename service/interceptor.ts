import axios, { AxiosRequestHeaders } from "axios";
//local storage keys
import { TOKEN_STORAGE_KEY } from "@/constants/config/enviroments";

const ApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_REST_API_URL,
  // paramsSerializer: {
  //   encode: parse as any,
  //   serialize: stringify as any, // or (params) => Qs.stringify(params, {arrayFormat: 'brackets'})
  // },
  headers: {
    "Content-Type": "application/json",
  },
});

ApiClient.interceptors.request.use(
  async (config: any) => {
    if (localStorage) {
      const authToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (authToken) {
        config.headers = {
          Authorization: `Bearer ${authToken}`,
        };
      }
    }

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
      localStorage.clear();
      window.location.href = "/connect";
      alert("Session expired, please login again");
      //toast.error('Session expired, please login again');
    }
    if (error.response && error.response.status === 402) {
      localStorage.clear();
      window.location.href = "/connect";
      alert("Authentication failed! Please login again");
      //toast.error('Session expired, please login again');
    }
    return Promise.reject(error);
  }
);

export default ApiClient;
