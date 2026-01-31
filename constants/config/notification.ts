// @/constants/config/notification.ts

export const NOTIFICATION_CONFIG: Record<string, { title: string; message: string }> = {
    // --- System & Network ---
    ['SERVER_ERROR']: {
        title: 'System Error',
        message: 'Request reverted due to a server error. Please try again later.'
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
        message: 'This wallet is not registered. Please join the platform.'
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
    ['TOKEN_ENCRYPTION_FAILED']: {
        title: 'Security Error',
        message: 'Failed to secure your session. Please try again.'
    },
    ['INVALID_TOKEN_FORMAT']: {
        title: 'Data Error',
        message: 'Session data is corrupted. Please re-authenticate.'
    },
    ['SIGNATURE_REJECTED']: {
        title: 'Signature Rejected',
        message: 'You rejected the wallet signature request.'
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
    ['USER_ALREADY_EXIST']: {
        title: 'Account Exists',
        message: 'This wallet is already registered. Please log in.'
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
    ['JOINING_FAILED']: {
        title: 'Registration Failed',
        message: 'We could not create your account. Please try again.'
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
    }
};