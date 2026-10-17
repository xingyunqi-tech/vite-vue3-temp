/**
 * 公共平台接口
 */

import { get, post } from '../core/request';
import { PLATFORM_HOST } from '@/constants';

// ==================== 用户与认证 ====================

/** 当前用户所属学校信息（get-current-user-detail 接口返回，非 Cookie 解析） */
export interface UserSchoolInfo {
  id: number;
  /** 学校 NID，对应 Cookie 里的 schoolNid */
  nid: string;
  /** 学校 ID，对应 SCHOOL_MAP 的 key */
  schoolId: string;
  schoolName: string;
}

/** 用户角色详情（字段以接口实测返回为准，只声明当前用到的部分） */
export interface UserRoleDetail {
  userNid: string;
  nickName: string;
  realName: string;
  avatar: string;
  /** 学校认证 NID，与 schoolInfo.nid 一致 */
  schoolCertificationNid: string;
  schoolInfo: UserSchoolInfo;
}

/** 获取当前用户角色详情 */
export const getUserRoleDetail = (params?: Record<string, any>) => {
  return post<UserRoleDetail>(`${PLATFORM_HOST}/console/v1/get-current-user-detail`, params);
};

/** 获取当前用户角色列表 */
export const getUserRoleList = (params?: Record<string, any>) => {
  return post<string[]>(`${PLATFORM_HOST}/console/v1/get-current-user-role`, params);
};

/** 获取 OAuth 认证信息 */
export const oauthGetIdentity = () => {
  return get(`${PLATFORM_HOST}/oauth/token/getIdentity`);
};

// ==================== 智慧树用户信息 ====================

/** 智慧树用户信息 */
export interface ZhsUserInfo {
  userId: number;
  userName: string;
  realName: string;
  headPic: string;
  mobile: string;
  email: string;
}

/** 获取智慧树用户信息 */
export const getZhsUserInfo = (params?: Record<string, any>) => {
  return get<ZhsUserInfo>(`${PLATFORM_HOST}/teachingCenterAi/user/getLoginUserInfo`, params);
};

// ==================== IM 服务 ====================

/** IM 用户签名 */
export interface AgentUserSig {
  userSig: string;
  userId: string;
  sdkAppId: number;
}

/** 注册 IM 用户并获取签名 */
export const getAgentUserSig = (params: Record<string, any>) => {
  return post<AgentUserSig>(`${PLATFORM_HOST}/chatim-user/v1/query/user-sig`, params);
};

// ==================== 课程公共服务 ====================

/** 获取当前用户在某课程下的角色（团队/助教） */
export const getCourseTeamUserRole = (params: { courseId: string | number }) => {
  return get(`${PLATFORM_HOST}/teacher-course/courseTeam/userRole`, params);
};

/** 获取当前用户身份（学生/教师） */
export const getCurrentUserIdentity = (params?: Record<string, any>) => {
  return get(`${PLATFORM_HOST}/user/user/get-current-user-identity`, params);
};
