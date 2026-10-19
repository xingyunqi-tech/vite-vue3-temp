export const AGREEMENT_MANAGE_PATH = '/system/agreement';

export interface AgreementDocument {
  type: 'userAgreement' | 'privacyPolicy' | 'aiService';
  label: string;
  /** 正文配置项，值为 HTML */
  contentKey: string;
  /** 版本号配置项，变更后用户需重新同意 */
  versionKey: string;
}

export const AGREEMENT_DOCUMENTS: readonly AgreementDocument[] = [
  {
    type: 'userAgreement',
    label: '用户协议',
    contentKey: 'agreement.userAgreement',
    versionKey: 'consent.userAgreementVersion',
  },
  {
    type: 'privacyPolicy',
    label: '隐私政策',
    contentKey: 'agreement.privacyPolicy',
    versionKey: 'consent.privacyPolicyVersion',
  },
  {
    type: 'aiService',
    label: 'AI 服务声明',
    contentKey: 'agreement.aiService',
    versionKey: 'consent.aiServiceVersion',
  },
];
