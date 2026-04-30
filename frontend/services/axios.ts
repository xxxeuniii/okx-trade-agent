/**
 * Axios 配置文件
 * 
 * 封装统一的HTTP请求配置，包括基础URL、超时时间、请求拦截器等
 */

import axios from 'axios';

// 创建axios实例
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8081',
  timeout: 30000, // 30秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
axiosInstance.interceptors.response.use(
  (response) => {
    // 统一处理响应数据
    return response.data;
  },
  (error) => {
    // 统一处理错误
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

export default axiosInstance;
