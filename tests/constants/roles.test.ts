import { describe, it, expect } from 'vitest';
import { IDENTITY_ROLE_TYPE, resolveIdentityTypes } from '@/constants';

describe('resolveIdentityTypes', () => {
  it('只保留 authority=true 的身份', () => {
    // 教师账号的实际返回：额外挂一条未认证的学生身份，算上它就会被判成双身份
    const identities = [
      { identityType: 0, authority: false },
      { identityType: 1, authority: true },
    ];

    expect(resolveIdentityTypes(identities)).toEqual([IDENTITY_ROLE_TYPE.TEACHER]);
  });

  it('未认证的教师身份不参与判定', () => {
    // 学生账号挂一条未认证教师身份，只看 identityType 会把它判成教师
    const identities = [
      { identityType: 1, authority: false },
      { identityType: 0, authority: true },
    ];

    expect(resolveIdentityTypes(identities)).toEqual([IDENTITY_ROLE_TYPE.STUDENT]);
  });

  it('教师与学生都认证过时两个身份都保留', () => {
    const identities = [
      { identityType: 0, authority: true },
      { identityType: 1, authority: true },
    ];

    expect(resolveIdentityTypes(identities)).toEqual([IDENTITY_ROLE_TYPE.STUDENT, IDENTITY_ROLE_TYPE.TEACHER]);
  });

  it('身份全部明确未认证时返回空数组，不向教师兜底', () => {
    const identities = [
      { identityType: 1, authority: false },
      { identityType: 0, authority: false },
    ];

    expect(resolveIdentityTypes(identities)).toEqual([]);
  });

  it('后端未下发 authority 时身份照用', () => {
    expect(resolveIdentityTypes([{ identityType: 0 }, { identityType: 1 }])).toEqual([
      IDENTITY_ROLE_TYPE.STUDENT,
      IDENTITY_ROLE_TYPE.TEACHER,
    ]);
  });

  it('去重，并丢弃 identityType 缺失或非数字的条目', () => {
    const identities = [
      { identityType: 0, authority: true },
      { identityType: 0, authority: true },
      { authority: true },
      { identityType: undefined, authority: true },
    ];

    expect(resolveIdentityTypes(identities)).toEqual([IDENTITY_ROLE_TYPE.STUDENT]);
  });

  it('认证过的条目都没有 identityType 时返回空数组', () => {
    const identities = [{ authority: true }, { identityType: 1, authority: false }];

    expect(resolveIdentityTypes(identities)).toEqual([]);
  });

  it('空列表返回空数组，由上层按判不出身份处理', () => {
    expect(resolveIdentityTypes([])).toEqual([]);
  });
});
