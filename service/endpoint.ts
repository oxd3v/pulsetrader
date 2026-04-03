const API_ENDPOINTS = {
  JOIN: '/join-user',
  CONNECT: '/connect',
  DISCONNECT: '/disconnect',
  CHECK_USER: '/check-user',
  WITHDRAW_FUND: '/withdraw-fund',
  CASH_OUT_ALL_FUND: '/cash-out-all-fund',
  GET_PRIVATE_KEY: '/get-private-key',
  CREATE_INVITATION_CODE: "/create-invitation-code",
  DELETE_INVITATION_CODE: "/delete-invitation-code",
  CREATE_NEW_WALLET: '/create-new-wallet',
  GET_HISTORY: '/get-history',
  ADD_TOKEN: '/add-token',
  GET_USER_HISTORIES: '/get-histories',
  APPROVE_AGENT: '/approve-agent',
  PERP_DEPOSIT: '/perp-deposit',
  QUOTE_PERP_DEPOSIT: '/quote-perp-deposit',
  GET_PERP_BALANCE: '/perp-balance',

  // order related endpoints
  GET_ORDER: '/get-order',
  ADD_ORDER: '/add-order',
  CREATE_ORDER: '/create-order',
  CLOSE_ORDER: '/close-order',
  GET_ORDER_BY_NAME: '/get-order-name',
  GET_USER_ALL_ORDER: '/get-all-orders',
  DELETE_ORDER: '/delete-order',
}

export default API_ENDPOINTS;


