import { hostname, port } from './host';
import { proxy } from './proxy';

/**
 * 开发代理
 */
export const devServer = () => {
  return {
    host: hostname,
    port,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    proxy,
  };
};
