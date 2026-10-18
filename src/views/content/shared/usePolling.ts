import { getCurrentScope, onScopeDispose } from 'vue';

export interface PollingOptions {
  interval: number;
  active: () => boolean;
  run: () => Promise<unknown>;
}

/** active 为真时每隔 interval 执行一次 run；作用域销毁后停止 */
export function usePolling(options: PollingOptions) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let running = false;

  const stop = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = () => {
    stop();
    if (disposed || !options.active()) return;
    timer = setTimeout(async () => {
      timer = null;
      running = true;
      await options.run().catch(() => undefined);
      running = false;
      schedule();
    }, options.interval);
  };

  const dispose = () => {
    disposed = true;
    stop();
  };

  if (getCurrentScope()) onScopeDispose(dispose);

  return { schedule, stop, dispose, polling: () => running };
}
