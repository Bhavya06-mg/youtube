import axios from "axios";
console.log("BACKEND:", process.env.NEXT_PUBLIC_BACKEND_URL); 
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
