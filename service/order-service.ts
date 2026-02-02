import ApiClient from "./interceptor";
import API_ENDPOINTS from "./endpoint";

const OrderService = {
  addOrder: (params:any) => ApiClient.post(API_ENDPOINTS.ADD_ORDER, params),
  getOrder: (params:any) =>
    ApiClient.get(API_ENDPOINTS.GET_ORDER, {
      params: {
        ...params,
      },
  }),
};

export default OrderService;
