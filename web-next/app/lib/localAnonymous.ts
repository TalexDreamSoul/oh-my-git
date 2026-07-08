export const LOCAL_ANONYMOUS_STORAGE_KEY = 'omg-web-local-anonymous';
export const LOCAL_ANONYMOUS_NAME_STORAGE_KEY = 'omg-web-local-anonymous-name';
export const LOCAL_ANONYMOUS_USER_ID = 'anonymous-local';
export const LOCAL_ANONYMOUS_NAME = '匿名测试';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export function isLocalAnonymousAllowed(hostname?: string) {
  const value = hostname ?? (typeof window === 'undefined' ? '' : window.location.hostname);
  return LOCAL_HOSTS.has(value) || value.endsWith('.localhost');
}
