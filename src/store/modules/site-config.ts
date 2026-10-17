import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  diffConfig,
  mergeConfig,
  validateConfig,
  type IConfigIssue,
  type SiteConfigOverrides,
} from '@/plugins/site-config';
import { getSiteConfigSource } from '@/plugins/site-config/source';

export const useSiteConfigStore = defineStore(
  'siteConfig',
  () => {
    // 用户自定义配置（只存储覆盖的部分）
    const config = ref<SiteConfigOverrides>({});

    /**
     * 合并默认值后的完整配置
     *
     * 读时也过一遍 validateConfig：已落库的非法值在这里被剔除/收敛，配置自动自愈，
     * 不必让用户靠「恢复默认」把正常配置一起丢掉。
     */
    const savedConfig = computed(() => mergeConfig(validateConfig(config.value).value));

    /**
     * 保存配置
     *
     * 入参可以是完整配置（设置页传的就是）：
     * 1. validateConfig 按 schema 剔除非法字段、收敛越界数值——代码模式只保证 JSON
     *    语法合法，语义校验只能落在这一层；
     * 2. diffConfig 收敛成仅覆盖项再持久化，保证 schema 默认值的后续变更对未显式
     *    改过该字段的用户仍然生效。
     *
     * @returns 被剔除/修正的问题列表，供调用方提示用户；空数组表示完全合法
     */
    const save = async (newConfig: SiteConfigOverrides): Promise<IConfigIssue[]> => {
      const { value, issues } = validateConfig(newConfig);
      const overrides = diffConfig(value);
      // 默认源是空实现（本地持久化由 persist 插件完成）；接了服务端源才真正发请求。
      // 先落远端再写本地：顺序反过来的话远端失败时配置已经生效并持久化，与「保存失败」的提示矛盾
      await getSiteConfigSource().save(overrides);
      config.value = overrides;
      return issues;
    };

    /**
     * 从存储源载入配置
     *
     * 本地源下是空操作（persist 插件已经恢复过），接了服务端源时才拉取远端覆盖项。
     * 远端数据同样过 validateConfig——不能假设服务端存的一定合法。
     */
    const load = async (): Promise<void> => {
      const remote = await getSiteConfigSource().load();
      if (Object.keys(remote).length > 0) {
        config.value = validateConfig(remote).value;
      }
    };

    return { config, savedConfig, save, load };
  },
  { persist: true },
);
