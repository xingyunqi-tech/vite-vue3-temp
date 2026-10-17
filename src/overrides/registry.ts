import { getUserInfoCookieRaw } from '@/utils/auth';

/**
 * 租户识别：Cookie → 学校代码
 *
 * 被 `index.ts` 与 `constants.ts` 两条加载链共用，因此只做识别、不 glob 任何租户模块，
 * 且只依赖 `@/utils/auth`（它不引用 `@/constants`）。依赖约束的原因见 ./constants.ts。
 */

/**
 * 学校注册表（按 schoolNid/schoolId 匹配）
 *
 * schoolNid → 学校代码映射。
 * 新增学校只需在此表加一行 + 创建对应目录（`overrides/{学校代码}/`）。
 *
 * 下方为写法示例，实际接入时按真实 schoolNid 填写。
 */
const SCHOOL_MAP: Record<string, string> = {
  // '<schoolNid>': '<学校代码>',
};

/**
 * 用户注册表（按 userId 匹配，优先级低于 SCHOOL_MAP）
 *
 * 适用于同一所学校中只有特定用户需要定制，或以个人身份上线定制功能的场景。
 * userId → 学校代码映射，可与 SCHOOL_MAP 中的学校代码相同，也可指向独立目录。
 *
 * 下方为写法示例，实际接入时按真实 userId 填写。
 */
const USER_MAP: Record<string, string> = {
  // '<userId>': '<学校代码>',
};

/**
 * 定向包锁定的学校代码，与 config/schoolFilter.ts 共用 VITE_BUILD_SCHOOL_CODE
 *
 * schoolFilter 负责「只把这所学校的代码打进包」，这里补上「运行时就认这所学校」。
 * 缺了后半段，定向包里的未登录访客拿不到定制：识别只能读 Cookie，未登录时读不出学校而
 * 返回 null，而免登录白名单（租户 router 维度的 whiteList）恰恰声明在学校配置里 ——
 * 免登录名单藏在需要登录才能加载的配置中，访客永远进不来。
 *
 * ⚠️ 定向包对所有访问者恒为这所学校，下面两张表都不再参与判断。通用包必须留空。
 */
const PINNED_SCHOOL_CODE: string = import.meta.env.VITE_BUILD_SCHOOL_CODE ?? '';

let cachedCookieUser: { raw: string; data: Record<string, unknown> } | null = null;

/**
 * 从 Cookie 中解析用户信息
 *
 * Cookie key 清单统一走 utils/auth 的 getUserInfoCookieRaw()（不同部署环境写入的 key 不一致），
 * 避免这里与 store/modules/user-info.ts 各写一份 key 列表导致其中一处漏配后静默失效。
 *
 * 按原始 Cookie 值缓存解析结果，省掉重复解析：getSchoolCode() 每次调用要读 schoolNid 与 userId
 * 两个字段，两条加载链又各调一次。键取原始值而非「只解析一次」，Cookie 变了即重新解析。
 *
 * ⚠️ 这不解决「被宿主嵌入时换账号」：租户配置在模块求值期就定下来了（overrides/index.ts 的
 * `const school`、constants/index.ts 的 applyConstantsOverrides），mount/unmount 不重跑那两处，
 * 与本函数缓存与否无关。
 */
function parseCookieUser(): Record<string, unknown> {
  const raw = getUserInfoCookieRaw();
  if (!raw) return {};
  if (cachedCookieUser?.raw === raw) return cachedCookieUser.data;

  try {
    const data = (JSON.parse(decodeURIComponent(raw)) as Record<string, unknown> | null) ?? {};
    cachedCookieUser = { raw, data };
    return data;
  } catch {
    return {};
  }
}

/**
 * 从 Cookie 获取当前用户的 schoolNid（即 schoolId）
 */
export function getSchoolNid(): string {
  const data = parseCookieUser();
  return (data.schoolNid as string) || (data.schoolId?.toString() ?? '');
}

/**
 * 从 Cookie 获取当前用户的 userId
 */
export function getUserId(): string {
  const data = parseCookieUser();
  return data.userId?.toString() ?? '';
}

/**
 * 获取当前学校代码
 *
 * 匹配优先级：VITE_BUILD_SCHOOL_CODE（定向打包）→ schoolNid → userId
 * - 定向包命中 → 恒为该学校，不再读 Cookie
 * - schoolNid 命中 → 整所学校的定制生效
 * - userId 命中 → 仅该用户的定制生效（适用于个人级定制场景）
 */
export function getSchoolCode(): string | null {
  if (PINNED_SCHOOL_CODE) return PINNED_SCHOOL_CODE;

  const nid = getSchoolNid();
  if (nid && SCHOOL_MAP[nid]) return SCHOOL_MAP[nid];

  const uid = getUserId();
  if (uid && USER_MAP[uid]) return USER_MAP[uid];

  return null;
}
