import { ElMessageBox } from 'element-plus';
import { onBeforeUnmount, onMounted } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';

export interface LeaveGuardOptions {
  /** 同一路由内 params 变化（如 /papers/a → /papers/b）时也确认 */
  guardParamsChange?: boolean;
}

function confirmLeave(): Promise<boolean> {
  return ElMessageBox.confirm('有未保存的修改，确定要离开吗？', '提示', {
    confirmButtonText: '离开',
    cancelButtonText: '留在本页',
    type: 'warning',
  })
    .then(() => true)
    .catch(() => false);
}

/** 有未保存修改时，切换路由弹窗确认，关闭或刷新标签页走浏览器原生确认 */
export function useLeaveGuard(shouldConfirm: () => boolean, options: LeaveGuardOptions = {}) {
  onBeforeRouteLeave(() => (shouldConfirm() ? confirmLeave() : true));

  if (options.guardParamsChange) {
    onBeforeRouteUpdate((to, from) => {
      const paramsChanged = JSON.stringify(to.params) !== JSON.stringify(from.params);
      return paramsChanged && shouldConfirm() ? confirmLeave() : true;
    });
  }

  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (shouldConfirm()) event.preventDefault();
  };
  onMounted(() => window.addEventListener('beforeunload', handleBeforeUnload));
  onBeforeUnmount(() => window.removeEventListener('beforeunload', handleBeforeUnload));
}
