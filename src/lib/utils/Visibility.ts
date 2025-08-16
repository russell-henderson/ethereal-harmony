// src/lib/utils/Visibility.ts
export const onVisibilityChange = (cb: (hidden: boolean) => void) => {
  const handler = () => cb(document.hidden)
  document.addEventListener('visibilitychange', handler)
  cb(document.hidden)
  return () => document.removeEventListener('visibilitychange', handler)
}
