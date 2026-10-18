/**
 * ==================== API 模块统一导出 ====================
 *
 * ⚠️ 本文件由 `pnpm orval` 的 afterAllFilesWrite 钩子（scripts/api/update-api-exports.ts）
 * 自动生成，请勿手写：下次生成会整份覆盖。要调整导出，改那个脚本。
 *
 * 使用指南：
 * - API 函数：import { getAuthUserInfo } from '@/api'
 * - 类型定义：import type { UserInfoResult } from '@/api'
 */

/**
 * ==================== 导出策略 ====================
 *
 * 0. 先 star 导出 core（HttpClient 实例与请求工具），绕过 Orval 直接发请求时从 @/api 取
 * 1. 再导出 model 里的类型定义（接口、枚举等）
 * 2. 再显式导出各 generated 模块的 API 函数（只导函数，不导 *Result 类型别名）
 * 3. 最后 star 导出 modules/ 里的自定义扩展与工具函数
 *
 * 为什么第 2 步用显式导出而不是 `export *`：
 * - model 里的接口（如 UploadCertificateResult）是后端返回的数据结构
 * - generated 模块里的同名类型别名是整个响应的类型
 * - 两者同名不同义，两个 `export *` 撞名会让该名字变成歧义导出
 *
 * 为什么被 modules/ 覆盖的函数不出现在第 2 步：
 * - ESM 里显式导出压过 `export *`，generated 显式导出了同名函数的话，
 *   modules/ 的覆盖版本永远拿不到（且不报错）。所以生成时已把它们剔除。
 */

// 0. HTTP 客户端与便捷请求函数
// 消费方统一从 @/api 取，无需知道 core/ 的内部结构
export * from './core';

// 1. 从 model 目录导出所有类型定义 (优先导出)
export * from './generated/model';

// 2. 自动生成的 API 函数 (只导出函数,不导出类型)
export {
  createAddress,
  getAddresses,
  getDefaultAddress,
  getAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from './generated/addresses/addresses';

export {
  adminGetExams,
  adminCreateExam,
  adminGetExam,
  adminUpdateExam,
  adminDeleteExam,
  adminPublishExam,
  adminOfflineExam,
  adminGetSubjects,
  adminCreateSubject,
  adminGetSubject,
  adminUpdateSubject,
  adminDeleteSubject,
  adminPublishSubject,
  adminOfflineSubject,
  adminGetSubjectKnowledgePoints,
  adminCreateKnowledgePoint,
  adminUpdateKnowledgePoint,
  adminDeleteKnowledgePoint,
  adminMoveKnowledgePoint,
  adminMigrateKnowledgePointQuestions,
  adminGetQuestions,
  adminCreateQuestion,
  adminBatchPublishQuestions,
  adminGetQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminGetQuestionVersions,
  adminSubmitQuestion,
  adminPublishQuestion,
  adminRejectQuestion,
  adminOfflineQuestion,
  adminGetPapers,
  adminCreatePaper,
  adminGetPaper,
  adminUpdatePaper,
  adminDeletePaper,
  adminSetPaperQuestions,
  adminPublishPaper,
  adminOfflinePaper,
  adminCopyPaper,
  adminGetPaperRules,
  adminCreatePaperRule,
  adminGetPaperRule,
  adminUpdatePaperRule,
  adminDeletePaperRule,
  adminPreviewPaperRule,
  adminGetDailyQuestionSets,
  adminRegenerateDailyQuestionSet,
  getMonitorQueues,
  getMonitorAlerts,
  acknowledgeMonitorAlert,
  adminCreateImport,
  adminGetImports,
  adminGetImport,
  adminDownloadImportErrors,
  adminCreateErrata,
  adminGetErrataList,
  adminGetErrata,
  adminRetryErrata,
  adminGetQuestionReports,
  adminGetQuestionReport,
  adminUpdateQuestionReport,
  adminRetriggerAccountCleanup,
  adminGetAiUsage,
} from './generated/admin/admin';

export {
  createAiConversation,
  getAiConversations,
  getAiMessages,
  sendAiMessage,
  deleteAiConversation,
  getAiMessage,
  getAiMessageEvents,
  stopAiMessage,
  setAiMessageFeedback,
  reportAiMessage,
  getAiQuota,
} from './generated/ai/ai';

export {
  alipayControllerCreateMobilePaymentV1,
  alipayControllerCreateMiniPaymentV1,
  alipayControllerCreateWebPaymentV1,
  alipayControllerQueryOrderV1,
  alipayControllerRefundV1,
  alipayControllerCloseOrderV1,
  alipayControllerNotifyV1,
} from './generated/alipay/alipay';

export { simpleHealthCheck } from './generated/api/api';

// 以下函数由 modules/ 覆盖，故不从 generated 导出：logout
export {
  loginWithEmail,
  registerWithEmail,
  confirmEmail,
  confirmNewEmail,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateCurrentUser,
  deleteCurrentUser,
  refreshToken,
  sendSmsCode,
  loginWithPhone,
  loginWithSms,
  registerWithPhone,
  resetPasswordByPhone,
  changePassword,
  loginWithWechat,
  loginWithWechatPhone,
  loginWithAlipay,
} from './generated/auth/auth';

export { getConfig, upsertConfig, getConfigAsAdmin } from './generated/config/config';

export { getAppInfo } from './generated/default/default';

export { getExams, getExamSubjects } from './generated/exams/exams';

export {
  createFavorite,
  getFavorites,
  checkFavorite,
  toggleFavorite,
  deleteFavorite,
} from './generated/favorites/favorites';

export { createFeedback, getFeedbacks, getFeedback } from './generated/feedbacks/feedbacks';

export { uploadFile } from './generated/files/files';

export { healthCheck, livenessProbe, readinessProbe } from './generated/health/health';

export {
  getMyExamProfiles,
  upsertMyExamProfile,
  deleteMyExamProfile,
  setMyCurrentExam,
  getStudyOverview,
  getStudyDaily,
  getStudyKnowledge,
  getStudyWeakPoints,
  getCheckins,
  getMyQuestionNotes,
  getMyQuestionReports,
  getMyConsents,
  agreeConsent,
} from './generated/me/me';

export {
  getNotifications,
  getUnreadCount,
  getNotificationSettings,
  updateNotificationSettings,
  getNotification,
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './generated/notifications/notifications';

export { createOrder, getOrders, getOrder, cancelOrder } from './generated/orders/orders';

export { generatePaper } from './generated/paper-rules/paper-rules';

export { getPaper } from './generated/papers/papers';

export {
  createPracticeSession,
  getPracticeSessions,
  getOngoingPracticeSessions,
  getPracticeSession,
  getPracticeSessionQuestions,
  savePracticeAnswers,
  selfAssessPracticeAnswer,
  updatePracticeProgress,
  getPracticeSessionReport,
  submitPracticeSession,
  abandonPracticeSession,
} from './generated/practice/practice';

export {
  getQuestion,
  saveQuestionNote,
  deleteQuestionNote,
  createQuestionReport,
} from './generated/questions/questions';

export {
  getProvinces,
  getCities,
  getDistricts,
  getRegionByCode,
  getRegionTree,
  queryRegions,
} from './generated/regions/regions';

export {
  createShare,
  getShares,
  getShareByCode,
  getShareById,
  deleteShare,
  getShareStats,
  trackShare,
  getWeChatConfig,
  getAlipayConfig,
} from './generated/shares/shares';

export {
  getSubjectPapers,
  getSubjectPaperRules,
  getSubjectDaily,
  getSubjectDailyTrial,
  checkSubjectDailyTrial,
  getSubjectKnowledgePoints,
} from './generated/subjects/subjects';

export { createUser, getUsers, getUser, updateUser, deleteUser } from './generated/users/users';

export {
  wechatPayControllerCreateJsapiPaymentV1,
  wechatPayControllerCreateAppPaymentV1,
  wechatPayControllerQueryOrderV1,
  wechatPayControllerRefundV1,
  wechatPayControllerNotifyV1,
} from './generated/wechat/wechat';

export {
  getWrongBook,
  getWrongBookSummary,
  masterWrongQuestion,
  restoreWrongQuestion,
} from './generated/wrong-book/wrong-book';

// 3. 自定义工具函数 (自动扫描 modules 目录)
export * from './modules/auth';
export * from './modules/content';
export * from './modules/override';
export * from './modules/remote-config';
