/**
 * Safe Area Types and Utilities for Cross-Platform Support
 * 
 * This module provides TypeScript types and utility functions for handling
 * device safe areas across iOS and Android devices with notches, dynamic islands,
 * home indicators, and soft navigation bars.
 */

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SafeAreaConfig {
  /** Enable safe area support (default: true) */
  enabled?: boolean;
  /** Minimum padding when safe area is 0 (default: 16px) */
  fallbackPadding?: number;
  /** Extra padding for bottom areas (useful for home indicators) */
  extraBottomPadding?: number;
  /** Apply to all device types or specific ones */
  deviceTypes?: ('ios' | 'android' | 'all')[];
}

export interface ModalSafeAreaProps {
  /** Apply safe area to modal container */
  containerSafeArea?: boolean;
  /** Apply safe area to modal content */
  contentSafeArea?: boolean;
  /** Apply safe area to modal footer/bottom action bar */
  footerSafeArea?: boolean;
  /** Custom safe area configuration */
  safeAreaConfig?: SafeAreaConfig;
}

/**
 * CSS Custom Properties for Safe Area
 */
export const SafeAreaCSSVars = {
  top: '--safe-area-inset-top',
  bottom: '--safe-area-inset-bottom', 
  left: '--safe-area-inset-left',
  right: '--safe-area-inset-right',
} as const;

/**
 * Safe Area CSS Environment Variables
 */
export const SafeAreaEnvVars = {
  top: 'env(safe-area-inset-top, 0px)',
  bottom: 'env(safe-area-inset-bottom, 0px)',
  left: 'env(safe-area-inset-left, 0px)', 
  right: 'env(safe-area-inset-right, 0px)',
} as const;

/**
 * Generate safe area padding with fallback
 */
export function generateSafeAreaPadding(
  direction: 'top' | 'bottom' | 'left' | 'right',
  fallback: number = 16
): string {
  const envVar = SafeAreaEnvVars[direction];
  return `max(${fallback}px, ${envVar})`;
}

/**
 * Generate safe area margin with fallback
 */
export function generateSafeAreaMargin(
  direction: 'top' | 'bottom' | 'left' | 'right',
  fallback: number = 16
): string {
  const envVar = SafeAreaEnvVars[direction];
  return `max(${fallback}px, ${envVar})`;
}

/**
 * Generate modal container styles with safe area support
 */
export function generateModalContainerStyles(config: SafeAreaConfig = {}): React.CSSProperties {
  const { fallbackPadding = 16,  } = config;
  
  return {
    margin: [
      generateSafeAreaMargin('top', fallbackPadding),
      generateSafeAreaMargin('right', fallbackPadding),
      generateSafeAreaMargin('bottom', fallbackPadding),
      generateSafeAreaMargin('left', fallbackPadding),
    ].join(' '),
    width: `calc(100vw - ${generateSafeAreaPadding('left', fallbackPadding)} - ${generateSafeAreaPadding('right', fallbackPadding)})`,
    height: `calc(100vh - ${generateSafeAreaPadding('top', fallbackPadding * 2)} - ${generateSafeAreaPadding('bottom', fallbackPadding * 2)})`,
    maxHeight: `calc(90vh - ${generateSafeAreaPadding('top', fallbackPadding * 2)} - ${generateSafeAreaPadding('bottom', fallbackPadding * 2)})`,
  };
}

/**
 * Generate bottom action bar styles with safe area support
 */
export function generateBottomActionBarStyles(config: SafeAreaConfig = {}): React.CSSProperties {
  const { fallbackPadding = 16, extraBottomPadding = 0 } = config;
  
  return {
    paddingTop: `${fallbackPadding}px`,
    paddingBottom: `calc(${fallbackPadding + extraBottomPadding}px + ${SafeAreaEnvVars.bottom})`,
    paddingLeft: generateSafeAreaPadding('left', fallbackPadding),
    paddingRight: generateSafeAreaPadding('right', fallbackPadding),
    minHeight: `calc(${100 + extraBottomPadding}px + ${SafeAreaEnvVars.bottom})`,
  };
}

/**
 * Generate header element styles with safe area support
 */
export function generateHeaderElementStyles(config: SafeAreaConfig = {}): React.CSSProperties {
  const { fallbackPadding = 16 } = config;
  
  return {
    marginTop: generateSafeAreaMargin('top', fallbackPadding),
    marginLeft: generateSafeAreaMargin('left', fallbackPadding),
    marginRight: generateSafeAreaMargin('right', fallbackPadding + 24),
  };
}

/**
 * Detect if device supports safe area insets
 */
export function supportsSafeArea(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for CSS support
  return CSS.supports('padding', 'max(0px)') && CSS.supports('padding', 'env(safe-area-inset-top)');
}

/**
 * Get safe area insets from CSS if available
 */
export function getSafeAreaInsets(): Promise<SafeAreaInsets> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !supportsSafeArea()) {
      resolve({ top: 0, bottom: 0, left: 0, right: 0 });
      return;
    }

    // Create a temporary element to measure safe area insets
    const testElement = document.createElement('div');
    testElement.style.position = 'fixed';
    testElement.style.top = '0';
    testElement.style.left = '0';
    testElement.style.width = '1px';
    testElement.style.height = '1px';
    testElement.style.visibility = 'hidden';
    testElement.style.paddingTop = SafeAreaEnvVars.top;
    testElement.style.paddingBottom = SafeAreaEnvVars.bottom;
    testElement.style.paddingLeft = SafeAreaEnvVars.left;
    testElement.style.paddingRight = SafeAreaEnvVars.right;
    
    document.body.appendChild(testElement);
    
    // Force a reflow
    requestAnimationFrame(() => {
      const computedStyle = getComputedStyle(testElement);
      const top = parseInt(computedStyle.paddingTop) || 0;
      const bottom = parseInt(computedStyle.paddingBottom) || 0;
      const left = parseInt(computedStyle.paddingLeft) || 0;
      const right = parseInt(computedStyle.paddingRight) || 0;
      
      document.body.removeChild(testElement);
      resolve({ top, bottom, left, right });
    });
  });
}

/**
 * Hook for safe area support detection and insets
 */
export function useSafeArea() {
  const [insets, setInsets] = React.useState<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 });
  const [isSupported, setIsSupported] = React.useState(false);

  React.useEffect(() => {
    const supported = supportsSafeArea();
    setIsSupported(supported);

    if (supported) {
      getSafeAreaInsets().then(setInsets);
      
      // Listen for orientation changes
      const handleOrientationChange = () => {
        setTimeout(() => {
          getSafeAreaInsets().then(setInsets);
        }, 100);
      };

      window.addEventListener('orientationchange', handleOrientationChange);
      window.addEventListener('resize', handleOrientationChange);

      return () => {
        window.removeEventListener('orientationchange', handleOrientationChange);
        window.removeEventListener('resize', handleOrientationChange);
      };
    }
  }, []);

  return {
    insets,
    isSupported,
    generateModalContainerStyles: (config?: SafeAreaConfig) => generateModalContainerStyles(config),
    generateBottomActionBarStyles: (config?: SafeAreaConfig) => generateBottomActionBarStyles(config),
    generateHeaderElementStyles: (config?: SafeAreaConfig) => generateHeaderElementStyles(config),
  };
}

// Import React for the hook
import React from 'react';

export type { React };
