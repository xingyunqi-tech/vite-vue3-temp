import type { ProxyOptions } from 'vite';

export const hostname = 'localhost';

export const port = 9091;

export const protocol = 'http:';

/** 代理目标 */
export const hostDict = {
  /** 本地服务 */
  LOCAL_SERVICE: 'localhost:3001',
  /** 后端 API 服务（⚠️ 按实际后端地址修改） */
  API_SERVICE: 'localhost:3002',
};

/** 开发环境代理 */
export const proxy: Record<string, ProxyOptions> = {
  '/localService': {
    target: `${protocol}//${hostDict.LOCAL_SERVICE}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/localService\//, ''),
  },
  '/api': {
    target: `${protocol}//${hostDict.API_SERVICE}`,
    changeOrigin: true,
  },
};

/** 开发服务器配置（vite-plugin-svg-icons 会对所有响应加 `Access-Control-Allow-Origin: *`） */
export const devServer = () => ({
  host: hostname,
  port,
  proxy,
});
