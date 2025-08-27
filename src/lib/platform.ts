export const isNativeApp =
  typeof window !== 'undefined' &&
  // @ts-expect-error
  !!window.Capacitor?.isNativePlatform?.();

export const getPlatform = () => {
  if (typeof window === 'undefined') return 'web';
  
  // @ts-expect-error
  if (window.Capacitor?.isNativePlatform?.()) {
    // @ts-expect-error
    return window.Capacitor.getPlatform();
  }
  
  return 'web';
};