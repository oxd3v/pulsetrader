// @/constants/config/notification.ts

export const NOTIFICATION_CONFIG: Record<string, { title: string; message: string }> = {
    // --- System & Network ---
    ['SERVER_ERROR']: {
        title: 'System Error',
        message: 'Request reverted due to a server error. Please try again later.'
    },
    ['UNAUTHENTICATED']: {
        title: 'Authetication failed',
        message: 'Request authentication failed.'
    },
    ['AUTHENTICATION_FAILED']:{
        title: 'Authetication failed',
        message: 'Authentication not set.'
    },
    ['API_FAILED']: {
        title: 'Connection Failed',
        message: 'Could not connect to the server. Please refresh and try again.'
    },
    ['TX_FAILED']: {
        title: 'Transaction Failed',
        message: 'The on-chain transaction could not be processed.'
    },
    ['WALLET_NOT_CONNECTED']: {
        title: 'Wallet Not Found',
        message: 'Please connect your crypto wallet to proceed.'
    },

    // --- Authentication & Session ---
    ['USER_REJECTED_SIGNATURE']:{
      title: 'Signature rejected',
      message: 'User reject the signature.'
    },
    ['SIGNATURE_FAILED']:{
      title: 'Signature failed',
      message: 'Wallet signature failed.'
    },
    ['NO_TOKEN_FOUND']: {
        title: 'Authentication Required',
        message: 'Please connect your account or join the platform.'
    },
    ['ACCOUNT_NOT_FOUND_IN_STORAGE']: {
        title: 'Session Error',
        message: 'Account data missing. Please reconnect your wallet.'
    },
    ['USER_NOT_FOUND']: {
        title: 'Account Not Found',
        message: 'This wallet is not joined. Please join the platform.'
    },
    ['TOKEN_EXPIRED']: {
        title: 'Session Expired',
        message: 'Your session has expired. Please sign your wallet to refresh.'
    },
    ['INVALID_AUTH_TOKEN']: {
        title: 'Invalid Session',
        message: 'Unauthorized connection detected. Please sign in again.'
    },
    ['INVALID_TOKEN']: {
        title: 'Invalid Token',
        message: 'The provided token is invalid or malformed.'
    },
    ['TOKEN_DECRYPTION_FAILED']: {
        title: 'Security Error',
        message: 'Failed to decrypt session token. Please clear cache and retry.'
    },
    ['SIGNATURE_AUTHENTICATION_FAILED']: {
        title: 'Security Error',
        message: 'Signature authentication failed. Try again after refresh.'
    },
    ['INVALID_TOKEN_FORMAT']: {
        title: 'Data Error',
        message: 'Session data is corrupted. Please re-authenticate.'
    },
    ['INVALID_SIGNATURE']: {
        title: 'Verification Failed',
        message: 'Wallet signature does not match the stored account.'
    },

    // --- User Status ---
    ['BLOCKED_USER']: {
        title: 'Account Suspended',
        message: 'Your account has been blocked. Please contact support.'
    },
    ['INVALID_USER']: {
        title: 'Unauthorized',
        message: 'You are not authorized to perform this action.'
    },
    
    ['SUCCESSFULLY_CONNECTED']: {
        title: 'Welcome Back',
        message: 'You have successfully signed in.'
    },
    ['LOGIN_SUCCESS']: {
        title: 'Login Successful',
        message: 'Welcome to the platform.'
    },

    // --- Registration & Invites ---
    ['ALREADY_USER']:{
        title: 'Already user',
        message: 'Wallet has already join this platform.'
    },
    ['UNAUTHORIZED_USER']:{
       title: 'Invitation failed',
       message: 'Unauthorized user join.'
    },
    ['UNAUTHORIZED_ACCOUNT']: {
        title: 'Access Denied',
        message: 'This account is not authorized to join.'
    },
    ['INVALID_INVITER']: {
        title: 'Invalid Inviter',
        message: 'The inviter data could not be verified.'
    },
    ['INVALID_INVITATION_CODE']: {
        title: 'Invalid Code',
        message: 'The invitation code provided is invalid or expired.'
    },
    ['INVALID_INVITATION_SENDER_ADDRESS']:{
        title: 'Invalid Code',
        message: 'Invalid invitation sender'
    },
    ['INVALID_STATUS']:{
       title: 'Invalid Code',
       message: 'Invalid invitation status'
    },
    ['EXPIRATION_MUST_BE_FUTURE']:{
       title: 'Registration Failed',
        message: 'Invalid invitation expire date'
    },
    ['INVALID_WALLET_COUNT']:{
       title: 'Registration Failed',
        message: 'Enter a valid number to create new wallet'
    },
    ['WALLET_GENERATE_FAILED']:{
        title: 'Registration Failed',
        message: 'Wallet generation failed'
    },
    ['INVALID_AMOUNT']:{
       title: 'Registration Failed',
        message: 'Enter a valid amount'
    },
    ['WALLET_NOT_FOUND']:{
       title: 'Registration Failed',
        message: 'Invalid or unauthorized wallet'
    },
    ['CODE_NOT_FOUND']:{
       title: 'Invotation not found',
       message: 'Invotation not found'
    },
    ['JOINING_FAILED']: {
        title: 'Registration Failed',
        message: 'We could not create your account. Please try again.'
    },
    ['DISCONNECT_USER']:{
        title: 'Disconnect user',
        message: 'Disconnect existing user first.'
    },
    ['JOIN_SUCCESS']: {
        title: 'Welcome!',
        message: 'Account created successfully.'
    },
    

    // --- Features (Withdraw/Wallets) ---
    ['WITHDRAW_SUCCESS']: {
        title: 'Success',
        message: 'Withdrawal initiated successfully.'
    },
    ['WITHDRAW_FAILED']: {
        title: 'Withdrawal Failed',
        message: 'Could not complete withdrawal. Check your balance or try again.'
    },
    ['WALLET_CREATION_SUCCESS']: {
        title: 'Success',
        message: 'New wallets generated successfully.'
    },
    ['WALLET_CREATION_FAILED']: {
        title: 'Creation Failed',
        message: 'Failed to generate new wallets.'
    },
    ['INVITATION_CREATED_SUCCESS']: {
        title: 'Code Created',
        message: 'Invitation code generated successfully.'
    },
    ['INVITATION_CREATION_FAILED']: {
        title: 'Creation Failed',
        message: 'Could not generate invitation code.'
    },
    ['INVITATION_REMOVED_SUCCESS']: {
        title: 'Code Removed',
        message: 'Invitation code deleted successfully.'
    },
    ['INVITATION_REMOVE_FAILED']: {
        title: 'Deletion Failed',
        message: 'Could not remove the invitation code.'
    },

    //token addition
    ['TOKEN_ADDED']:{
        title: 'Succesfully token add',
        message: 'Spot asset added successfully'
    },
    ['TOKEN_ALREADY_ADDED']:{
        title: 'Asset already added',
        message: 'Spot asset already in whitelist'
    },
    ['MAX_EXCEED_ASSET_ACCESS']:{
       title: 'Asset already added',
        message: 'Spot asset access limit exceed'
    },
    ['MAX_ACCED_ASSET_ACCESS']:{
        title: 'Asset max exceed',
        message: 'Spot asset exceed max limit of tier'
    },

    //order-creation
    ['INVALID_EST_ORDERS']:{
        title: 'Invalid est orders',
        message: 'Invalid estimate orders'
    },
    ['USER_NOT_ELIGIBLE']:{
        title: 'User not eligble',
        message: 'User not eligble'
    },
    ['TOKEN_NOT_ADDED']:{
        title: 'Unspported token',
        message: 'Unsupported token to create order'
    },
    ['UNSUPPORTED_STRATEGY']:{
        title: 'Unspported strategy',
        message: 'Strategy not supported in this tier'
    },
    ['MINIMUM_USD_COLLATERAL_REQUIRED']:{
       title: 'Exist order name',
       message: 'Minimum collateral amount required'
    },
    ['EXIST_ORDER_NAME']:{
        title: 'Exist order name',
        message: 'Order name already exist'
    },
    ['INSUFFICIENT_WALLET_FOUND']:{
        title: 'Insufficient wallet',
        message: 'Insufficient wallet found.'
    },
    ['INVALID_WALLETS']:{
        title: 'Invalid wallet',
        message: 'Invalid wallet selection for orders.'
    },
    ['EXCEED_ORDER_LIMIT']:{
        title: 'Exceed orders',
        message: 'Exceed order limit'
    },
    ['ORDER_CREATED_FAILED']:{
        title: 'Exceed orders',
        message: 'Failed to create orders'
    },
    ['ORDER_CREATION_SUCCESS']:{
        title: 'Successfully order created',
        message: 'Orders created successfully'
    },
    ['INVALID_ORDER']:{
        title: 'Invalid orders',
        message: 'Invalid order format'
    },
    ['ORDER_NOT_EXIST']:{
        title: 'Order not exist',
        message: 'Order not exist'
    },
    ['ORDER_IN_USE']:{
        title: 'Order in processing',
        message: 'Order in processing.'
    },
    ['INVALID_NETWORK']:{
        title: 'Order in processing',
        message: 'Invalid network'
    },
    ['UNSUPPORTED_NETWORK']:{
        title: 'Order in processing',
        message: 'Network not supported'
    },
    ['ORDER_CLOSE_FAILED']:{
        title: 'Order closed',
        message: 'Failed to close order'
    },
    ['ORDER_DELETE_SUCCESS']:{
        title: 'delete success',
        message: 'Order deleted successfully'
    },
    ['ORDER_FETCH_SUCCESS']:{
        title: 'fetch success',
        message: 'Order fetched successfully'
    }
};