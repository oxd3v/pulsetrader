import axios from "axios";

export async function axiosRequest({
  url,
  method = "GET",
  headers = {},
  params = {},
  data = {}
}) {
  const response = await axios({
    url,
    method,
    headers,
    params,
    data
  });
  return response.data;
}

export function handleAxiosError(err) {
  const PERMANENT_STATUS_CODES = new Set([
    400, 401, 403, 404, 405, 406, 409, 410, 415, 422,
  ]);
  const RETRYABLE_STATUS_CODES = new Set([[429, 500, 502, 503, 504, 408]]);

  const CUSTOM_ERROR_MESSAGES = {
    400: "Invalid request. Please check your data.",
    401: "Authentication failed. Please log in again.",
    403: "Permission denied.",
    404: "Resource not found.",
    409: "Data conflict detected.",
    429: "Too many requests. Please try again later.",
    500: "Server error occurred. Please try again.",
    503: "Service temporarily unavailable.",
    DEFAULT_NETWORK_ERROR:
      "Network connection issue. Please check your internet.",
    DEFAULT_CLIENT_ERROR: "Request error. Please check your input.",
  };

  if (axios.isAxiosError(err)) {
    if (err.response) {
      const statusCode = err.response.status;
      const shouldContinue = RETRYABLE_STATUS_CODES.has(statusCode);

      return {
        message: CUSTOM_ERROR_MESSAGES[statusCode] || err.message,
        shouldContinue,
      };
    }

    if (err.request) {
      return {
        message: CUSTOM_ERROR_MESSAGES.DEFAULT_NETWORK_ERROR,
        shouldContinue: true,
      };
    }
  }
  return {
    message: err?.message || "Unexpected Axios error.",
    shouldContinue: false,
  };
}

export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 1000,
    factor = 2,
    force = false,
  } = options;

  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;

      let errDetails = handleAxiosError(error);

      if (
        (errDetails.shouldContinue == false && force == false) ||
        attempt >= maxRetries
      ) {
        throw new Error(`${errDetails.message}`);
      }

      const delay = Math.min(
        initialDelay * Math.pow(factor, attempt - 1),
        maxDelay
      );
      const jitter = delay * 0.2 * Math.random();
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
    }
  }

  throw new Error(`Max retries exceeded: ${errDetails.message}`);
}