// Cache only successful/live attempts. A timed-out late detector is disposed.
export function createDetectorLoader(create, timeoutMs = 20000) {
  let pending;
  return function load() {
    if (pending) return pending;
    let expired = false, timer;
    const attempt = Promise.resolve().then(create);
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        expired = true;
        const error = new Error('モデル読み込みがタイムアウトしました。通信を確認して再試行してください');
        error.name = 'TimeoutError'; reject(error);
      }, timeoutMs);
    });
    attempt.then(task => { if (expired) task.close?.(); }, () => {});
    pending = Promise.race([attempt, timeout]).catch(error => {pending = null; throw error;})
      .finally(() => clearTimeout(timer));
    return pending;
  };
}
