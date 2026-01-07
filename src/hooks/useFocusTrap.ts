import { useEffect, useRef } from 'react';

/**
 * Hook to trap focus within a container when active.
 * Handles:
 * - Trapping Tab key navigation
 * - Closing on Escape key
 * - Restoring focus on unmount/deactivation
 * - Initial focus setting
 */
export function useFocusTrap(isActive: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive) {
      // Save previously focused element
      previousFocus.current = document.activeElement as HTMLElement;

      // Find all focusable elements
      const focusableElements = containerRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Focus the first element
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && onClose) {
          onClose();
          return;
        }

        if (e.key === 'Tab') {
          const focusable = containerRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if (!focusable || focusable.length === 0) {
            e.preventDefault();
            return;
          }

          const first = focusable[0] as HTMLElement;
          const last = focusable[focusable.length - 1] as HTMLElement;

          // Shift + Tab: if on first element, move to last
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          }
          // Tab: if on last element, move to first
          else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Lock body scroll
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalStyle;

        // Restore focus
        if (previousFocus.current && previousFocus.current.isConnected) {
          previousFocus.current.focus();
        }
      };
    }
  }, [isActive, onClose]);

  return containerRef;
}
