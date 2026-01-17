import ApiClient from "./interceptor";
import API_ENDPOINTS from "./endpoint";

const UserService = {
  //user related
  checkUser: (params:any) =>
    ApiClient.get(API_ENDPOINTS.CHECK_USER, {
      params: {
        ...params,
      },
  }),
  joinUser: (params:any) => ApiClient.post(API_ENDPOINTS.JOIN, params),
  getHistory: (params:any) => ApiClient.get(API_ENDPOINTS.GET_HISTORY, {
    params: {
      ...params,
    },
  }),
  addToken: (params:any) => ApiClient.post(API_ENDPOINTS.ADD_TOKEN, params),
  createInvitationCode: (params:any) => ApiClient.post(API_ENDPOINTS.CREATE_INVITATION_CODE, params),
  
  //order related
  getUserOrder: (params:any) =>
    ApiClient.get(API_ENDPOINTS.GET_ORDER, {
      params: {
        ...params,
      },
  }),
  //wallet related
  getPrivateKey: (params:any) =>
    ApiClient.get(API_ENDPOINTS.GET_PRIVATE_KEY, {
      params: {
        ...params,
      },
  }),
  withdraw: (params:any) => ApiClient.post(API_ENDPOINTS.WITHDRAW_FUND, params),
  cashOutAll: (params:any) => ApiClient.post(API_ENDPOINTS.CASH_OUT_ALL_FUND, params),
  createNewWallet: (params:any) => ApiClient.post(API_ENDPOINTS.CREATE_NEW_WALLET, params),
};

export default UserService;
