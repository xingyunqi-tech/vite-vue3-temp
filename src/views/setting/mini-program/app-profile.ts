import { isAxiosError } from 'axios';
import { appProfileSchema, type AppProfileSectionKey } from './schema';
import type { AppProfile, UpdateAppProfileDto } from '@/api';
import { validateConfig, type IConfigIssue } from '@/plugins/site-config';

export type AppProfileField = keyof AppProfile;

/** 编辑器中的分组值，未配置的字段为空字符串 */
export type AppProfileEditorValue = Record<string, Record<string, unknown>>;

const UNPROCESSABLE_ENTITY = 422;

/** 每个接口字段所在的分组 */
export const APP_PROFILE_FIELD_SECTIONS = Object.fromEntries(
  Object.entries(appProfileSchema).flatMap(([sectionKey, section]) =>
    Object.keys(section.properties).map(fieldKey => [fieldKey, sectionKey]),
  ),
) as Record<AppProfileField, AppProfileSectionKey>;

export const APP_PROFILE_FIELDS = Object.keys(APP_PROFILE_FIELD_SECTIONS) as AppProfileField[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function toEditorValue(profile: Partial<AppProfile> | null | undefined): AppProfileEditorValue {
  const result: AppProfileEditorValue = {};
  for (const [sectionKey, section] of Object.entries(appProfileSchema)) {
    result[sectionKey] = Object.fromEntries(
      Object.keys(section.properties).map(fieldKey => [fieldKey, profile?.[fieldKey as AppProfileField] ?? '']),
    );
  }
  return result;
}

/** 字符串字段去除首尾空白，其余值原样保留 */
export function normalizeEditorValue(value: AppProfileEditorValue): AppProfileEditorValue {
  return Object.fromEntries(
    Object.entries(value).map(([sectionKey, section]) => [
      sectionKey,
      isRecord(section)
        ? Object.fromEntries(
            Object.entries(section).map(([fieldKey, field]) => [
              fieldKey,
              typeof field === 'string' ? field.trim() : field,
            ]),
          )
        : section,
    ]),
  );
}

/** schema 中不存在的分组或字段；保存时不提交，可以忽略 */
export function isUnknownProfilePath(path: string): boolean {
  if (!path) return false;
  const [sectionKey, fieldKey, ...rest] = path.split('.');
  if (!Object.hasOwn(appProfileSchema, sectionKey)) return true;
  const section = appProfileSchema[sectionKey as AppProfileSectionKey];
  return fieldKey !== undefined && rest.length === 0 && !Object.hasOwn(section.properties, fieldKey);
}

/** 按去除首尾空白后的值校验 */
export function validateAppProfile(value: unknown): IConfigIssue[] {
  const input = isRecord(value) ? normalizeEditorValue(value as AppProfileEditorValue) : value;
  return validateConfig(input, appProfileSchema).issues;
}

/** 去除首尾空白，空字符串提交 null */
export function toAppProfilePayload(value: AppProfileEditorValue): UpdateAppProfileDto {
  return Object.fromEntries(
    APP_PROFILE_FIELDS.map(field => {
      const raw = value[APP_PROFILE_FIELD_SECTIONS[field]]?.[field];
      return [field, typeof raw === 'string' ? raw.trim() || null : null];
    }),
  ) as UpdateAppProfileDto;
}

export const issuePath = (field: AppProfileField) => `${APP_PROFILE_FIELD_SECTIONS[field]}.${field}`;

/** 后端 422 的字段错误转为编辑器问题，路径为「分组.字段」；不是字段错误时返回空数组 */
export function toFieldIssues(error: unknown): IConfigIssue[] {
  if (!isAxiosError(error)) return [];
  const body: unknown = error.response?.data;
  const code = isRecord(body) ? body.code : undefined;
  if (error.response?.status !== UNPROCESSABLE_ENTITY && code !== UNPROCESSABLE_ENTITY) return [];
  const data = error.errorData ?? (isRecord(body) && isRecord(body.data) ? body.data : null);
  if (!data) return [];
  return APP_PROFILE_FIELDS.flatMap(field => {
    const message = data[field];
    return typeof message === 'string' && message ? [{ path: issuePath(field), message }] : [];
  });
}
