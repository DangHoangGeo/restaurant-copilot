/**
 * Safe Area Hook and Components
 * 
 * Provides React hooks and components for handling device safe areas
 * across different platforms and screen configurations.
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { SafeAreaInsets, SafeAreaConfig } from '@/types/safe-area';

/**
 * Hook for detecting and using safe area insets
 */
export function useSafeArea() {
  const [insets, setInsets] = useState<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [isSupported, setIsSupported] = useState(false);

  const updateInsets = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // Check if CSS supports safe area
    const supported = CSS.supports('padding', 'max(0px)') && CSS.supports('padding', 'env(safe-area-inset-top)');
    setIsSupported(supported);

    if (!supported) {
      setInsets({ top: 0, bottom: 0, left: 0, right: 0 });
      return;
    }

    // Create a temporary element to measure safe area insets
    const testElement = document.createElement('div');
    testElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      visibility: hidden;
      pointer-events: none;
      padding-top: env(safe-area-inset-top, 0px);
      padding-bottom: env(safe-area-inset-bottom, 0px);
      padding-left: env(safe-area-inset-left, 0px);
      padding-right: env(safe-area-inset-right, 0px);
    `;
    
    document.body.appendChild(testElement);
    
    // Force a reflow and measure
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    const computedStyle = getComputedStyle(testElement);
    const newInsets = {
      top: parseInt(computedStyle.paddingTop) || 0,
      bottom: parseInt(computedStyle.paddingBottom) || 0,
      left: parseInt(computedStyle.paddingLeft) || 0,
      right: parseInt(computedStyle.paddingRight) || 0,
    };
    
    document.body.removeChild(testElement);
    setInsets(newInsets);
  }, []);

  useEffect(() => {
    updateInsets();

    // Listen for orientation and resize changes
    const handleChange = () => {
      // Delay to ensure viewport has settled
      setTimeout(updateInsets, 150);
    };

    window.addEventListener('orientationchange', handleChange);
    window.addEventListener('resize', handleChange);
    
    // Also listen for viewport changes (iOS Safari)
    const mediaQuery = window.matchMedia('(orientation: portrait)');
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      window.removeEventListener('orientationchange', handleChange);
      window.removeEventListener('resize', handleChange);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [updateInsets]);

  return {
    insets,
    isSupported,
    hasNotch: insets.top > 0,
    hasHomeIndicator: insets.bottom > 0,
    hasSideInsets: insets.left > 0 || insets.right > 0,
  };
}

/**
 * Generate CSS styles for safe area aware modals
 */
export function useSafeAreaModalStyles(config: SafeAreaConfig = {}) {
  const { insets, isSupported } = useSafeArea();
  const { fallbackPadding = 16, extraBottomPadding = 0 } = config;

  const containerStyles: React.CSSProperties = isSupported ? {
    width: `calc(100vw - max(${fallbackPadding}px, env(safe-area-inset-left, 0px)) - max(${fallbackPadding}px, env(safe-area-inset-right, 0px)))`,
    height: `calc(100vh - max(${fallbackPadding * 2}px, env(safe-area-inset-top, 0px)) - max(${fallbackPadding * 2}px, env(safe-area-inset-bottom, 0px)))`,
    margin: `max(${fallbackPadding}px, env(safe-area-inset-top, 0px)) max(${fallbackPadding}px, env(safe-area-inset-right, 0px)) max(${fallbackPadding}px, env(safe-area-inset-bottom, 0px)) max(${fallbackPadding}px, env(safe-area-inset-left, 0px))`,
    maxHeight: `calc(90vh - max(${fallbackPadding * 2}px, env(safe-area-inset-top, 0px)) - max(${fallbackPadding * 2}px, env(safe-area-inset-bottom, 0px)))`,
  } : {
    width: `calc(100vw - ${fallbackPadding * 2}px)`,
    height: `calc(100vh - ${fallbackPadding * 4}px)`,
    margin: `${fallbackPadding}px`,
    maxHeight: `calc(90vh - ${fallbackPadding * 4}px)`,
  };

  const contentStyles: React.CSSProperties = isSupported ? {
    paddingLeft: `max(${fallbackPadding}px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(${fallbackPadding}px, env(safe-area-inset-right, 0px))`,
  } : {
    paddingLeft: `${fallbackPadding}px`,
    paddingRight: `${fallbackPadding}px`,
  };

  const footerStyles: React.CSSProperties = isSupported ? {
    paddingTop: `${fallbackPadding}px`,
    paddingBottom: `calc(${fallbackPadding + extraBottomPadding}px + env(safe-area-inset-bottom, 0px))`,
    paddingLeft: `max(${fallbackPadding}px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(${fallbackPadding}px, env(safe-area-inset-right, 0px))`,
    minHeight: `calc(${100 + extraBottomPadding}px + env(safe-area-inset-bottom, 0px))`,
  } : {
    paddingTop: `${fallbackPadding}px`,
    paddingBottom: `${fallbackPadding * 2 + extraBottomPadding}px`,
    paddingLeft: `${fallbackPadding}px`,
    paddingRight: `${fallbackPadding}px`,
    minHeight: `${120 + extraBottomPadding}px`,
  };

  const headerStyles: React.CSSProperties = isSupported ? {
    paddingTop: `max(0px, env(safe-area-inset-top, 0px))`,
    paddingLeft: `max(0px, env(safe-area-inset-left, 0px))`,
    paddingRight: `max(24px, env(safe-area-inset-right, 0px))`, // Extra space for close button
  } : {
    paddingLeft: '0px',
    paddingRight: '24px',
  };

  return {
    containerStyles,
    contentStyles,
    footerStyles,
    headerStyles,
    insets,
    isSupported,
  };
}

/**
 * Generate safe area aware positioning styles
 */
export function useSafeAreaPositioning() {
  const { insets, isSupported } = useSafeArea();

  const generatePositionStyles = (
    position: 'top' | 'bottom' | 'left' | 'right',
    fallback: number = 16
  ): React.CSSProperties => {
    if (!isSupported) {
      return { [position]: `${fallback}px` };
    }

    const envVar = `env(safe-area-inset-${position}, 0px)`;
    return { [position]: `max(${fallback}px, ${envVar})` };
  };

  return {
    generatePositionStyles,
    insets,
    isSupported,
    // Preset positions
    safeTop: generatePositionStyles('top'),
    safeBottom: generatePositionStyles('bottom'),
    safeLeft: generatePositionStyles('left'),
    safeRight: generatePositionStyles('right'),
  };
}

/**
 * Safe Area Context Provider (optional for global state)
 */
const SafeAreaContext = createContext<{
  insets: SafeAreaInsets;
  isSupported: boolean;
  hasNotch: boolean;
  hasHomeIndicator: boolean;
  hasSideInsets: boolean;
} | null>(null);

export function SafeAreaProvider({ children }: { children: React.ReactNode }) {
  const safeArea = useSafeArea();

  return (
    <SafeAreaContext.Provider value={safeArea}>
      {children}
    </SafeAreaContext.Provider>
  );
}

export function useSafeAreaContext() {
  const context = useContext(SafeAreaContext);
  if (!context) {
    throw new Error('useSafeAreaContext must be used within a SafeAreaProvider');
  }
  return context;
}

/**
 * Higher-order component for adding safe area support to modals
 */
export function withSafeArea<P extends object>(
  Component: React.ComponentType<P>,
  config: SafeAreaConfig = {}
) {
  return function SafeAreaWrappedComponent(props: P) {
    const modalStyles = useSafeAreaModalStyles(config);
    
    return (
      <Component 
        {...props} 
        safeAreaStyles={modalStyles}
      />
    );
  };
}

export default useSafeArea;
