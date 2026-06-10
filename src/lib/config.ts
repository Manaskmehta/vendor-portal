export const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3001/api";

export const API_BASE = API_URL.replace(/\/api$/, "");

export const TOKEN_KEY = "vendor_token";
export const USER_KEY = "vendor_user";
