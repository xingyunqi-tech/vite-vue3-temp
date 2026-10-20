import { ElMessage, ElMessageBox } from 'element-plus';
import { reactive } from 'vue';

export function confirmAction(message: string, title = '确认操作'): Promise<boolean> {
  return ElMessageBox.confirm(message, title, { type: 'warning' })
    .then(() => true)
    .catch(() => false);
}

/** 执行操作并在成功时提示；请求失败的提示由请求层统一弹出 */
export async function runAction(task: () => Promise<unknown>, successMessage?: string): Promise<boolean> {
  try {
    await task();
    if (successMessage) ElMessage.success(successMessage);
    return true;
  } catch {
    return false;
  }
}

/** 行内写操作：同一行执行中时忽略重复触发，不同行互不影响 */
export function useRowAction() {
  const actingIds = reactive(new Set<string>());
  const isActing = (id: string) => actingIds.has(id);
  const run = async (id: string, task: () => Promise<unknown>, successMessage: string): Promise<boolean> => {
    if (actingIds.has(id)) return false;
    actingIds.add(id);
    try {
      return await runAction(task, successMessage);
    } finally {
      actingIds.delete(id);
    }
  };
  return { isActing, run };
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
