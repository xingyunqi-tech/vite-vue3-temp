/**
 * API响应通用接口
 */
export interface IResponse<T = any> {
  /** 响应消息 */
  message: string;
  /** 响应码，200表示成功 */
  rtn: number;
  /** 响应数据 */
  data?: T;
}
