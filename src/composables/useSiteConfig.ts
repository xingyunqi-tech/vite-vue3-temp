import { reactive } from 'vue';
import { useSiteConfigStore } from '@/store/modules/site-config';

/**
 * 站点配置快捷访问
 *
 * 用法：
 * ```ts
 * const siteConfig = useSiteConfig();
 * // 读取: siteConfig.config.basic.systemTitle
 * // 写入: 传完整配置，缺省的字段回到默认值
 * //       const { config } = siteConfig;
 * //       await siteConfig.save({ ...config, basic: { ...config.basic, systemTitle: '新标题' } })
 * //       返回被剔除/修正的项（IConfigIssue[]），空数组表示完全合法
 * // 载入: await siteConfig.load()   // 本地源下是空操作，接了服务端源才拉取
 * ```
 */
export function useSiteConfig() {
  const store = useSiteConfigStore();

  return reactive({
    get config() {
      return store.savedConfig;
    },
    save: store.save,
    load: store.load,
  });
}
