/**
 * 站点配置的存储源
 *
 * 模板默认把配置存在本地（Pinia + IndexedDB 持久化），因为模板无法预设下游项目
 * 一定有配置接口。但「系统标题 / Logo / 水印」在语义上是**站点级**的：存本地意味着
 * 换台机器就回默认值，且用户能在 devtools 里改掉自己的水印开关。
 *
 * 因此这里留一个接缝：业务项目要多端一致（或水印属于合规要求）时，实现一个走接口的
 * source 并在 main.ts 里 setSiteConfigSource() 注入即可，无需改动 store、页面和组件。
 *
 * ```ts
 * import { get, put } from '@/api';
 *
 * setSiteConfigSource({
 *   load: async () => (await get<SiteConfigOverrides | null>('/site-config')) ?? {},
 *   save: overrides => put('/site-config', overrides),
 * });
 * ```
 */
import type { SiteConfigOverrides } from '@/plugins/site-config';

export interface ISiteConfigSource {
  /** 读取覆盖项；返回空对象表示「没有远端配置，用本地的」 */
  load(): Promise<SiteConfigOverrides>;
  /** 持久化覆盖项 */
  save(overrides: SiteConfigOverrides): Promise<void>;
}

/**
 * 默认源：空实现
 *
 * 本地持久化由 Pinia 的 persist 插件完成，这里不需要做任何事——
 * 保留空实现是为了让「有没有接服务端」只体现在这一个对象上。
 */
export const localSiteConfigSource: ISiteConfigSource = {
  load: async () => ({}),
  save: async () => {},
};

let currentSource: ISiteConfigSource = localSiteConfigSource;

export function setSiteConfigSource(source: ISiteConfigSource): void {
  currentSource = source;
}

export function getSiteConfigSource(): ISiteConfigSource {
  return currentSource;
}
