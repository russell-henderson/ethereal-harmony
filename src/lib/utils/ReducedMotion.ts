// src/lib/utils/ReducedMotion.ts
export const onReducedMotionChange = (cb: (reduced: boolean) => void) => {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
  const handler = (e: MediaQueryListEvent) => cb(e.matches)
  if (mql.addEventListener) mql.addEventListener('change', handler)
  else mql.addListener(handler)
  cb(mql.matches)
  return () => {
    if (mql.removeEventListener) mql.removeEventListener('change', handler)
    else mql.removeListener(handler)
  }
}
