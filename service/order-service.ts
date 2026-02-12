import ApiClient from "./interceptor";
import API_ENDPOINTS from "./endpoint";

const OrderService = {
  addOrder: (params:any) => ApiClient.post(API_ENDPOINTS.ADD_ORDER, params),
  deleteOrde: (params:any) => ApiClient.post(API_ENDPOINTS.DELETE_ORDER, params),
  closeOrder: (params:any) => ApiClient.post(API_ENDPOINTS.CLOSE_ORDER, params),
  getOrder: (params:any) =>
    ApiClient.get(API_ENDPOINTS.GET_ORDER, {
      params: {
        ...params,
      },
  }),
};

export default OrderService;
