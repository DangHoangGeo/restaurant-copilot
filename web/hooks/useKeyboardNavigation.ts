"use client";

import { useEffect, useCallback } from "react";

interface UseKeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onTab?: () => void;
  disabled?: boolean;
}

export function useKeyboardNavigation({
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
  onTab,
  disabled = false
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case "Escape":
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        break;
      case "Enter":
        if (onEnter && event.target instanceof HTMLElement && event.target.tagName !== "BUTTON") {
          event.preventDefault();
          onEnter();
        }
        break;
      case "ArrowUp":
        if (onArrowUp) {
          event.preventDefault();
          onArrowUp();
        }
        break;
      case "ArrowDown":
        if (onArrowDown) {
          event.preventDefault();
          onArrowDown();
        }
        break;
      case "Tab":
        if (onTab) {
          onTab();
        }
        break;
    }
  }, [disabled, onEscape, onEnter, onArrowUp, onArrowDown, onTab]);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, disabled]);
}

/**
 * Hook for managing focus within a container
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleTabKey);
    
    // Focus first element when trap becomes active
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      container.removeEventListener("keydown", handleTabKey);
    };
  }, [containerRef, isActive]);
}

/**
 * Hook for announcing screen reader messages
 */
export function useScreenReaderAnnouncement() {
  const announce = useCallback((message: string, priority: "polite" | "assertive" = "polite") => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", priority);
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return announce;
}
