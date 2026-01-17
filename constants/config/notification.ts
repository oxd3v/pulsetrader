export const NOTIFICATION_CONFIG: Record<string, Record<string, any>> = {
    ['ACCOUNT_NOT_FOUND_IN_STORAGE']:{
        message: 'Connect you account or join the platform.'
    },
    ['API_FAILED']:{
        message: 'Connection failed! Refresh and try again.'
    },
    ['USER_NOT_FOUND']:{
        message: 'Account not connected. join the platform.'
    },
    ['TOKEN_EXPIRED']:{
        message: 'Connection expired.Signed you Wallet!'
    },
    ['INVALID_AUTH_TOKEN']:{
        message: 'Unauthorized connection. signed your wallet!'
    },
    ['BLOCKED_USER']:{
        message: 'Account suspended! Contact help!'
    },
    ['SUCCESFULL_USER_CONNECTION']:{
        message: 'User connected successfully!'
    },
    ['INVALID_USER']:{
        message: 'Unauthorized User! Contact help!'
    }
}