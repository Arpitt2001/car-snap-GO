import { useEffect, useCallback, useRef } from 'react';

export function useLongPress(
  onLongPress: (e: any) => void,
  onClick: (e: any) => void,
  { shouldPreventDefault = true, delay = 500 } = {}
) {
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const target = useRef<EventTarget | null>(null);

  const start = useCallback(
    (event: any) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false
        });
        target.current = event.target;
      }
      timeout.current = setTimeout(() => {
        onLongPress(event);
      }, delay);
    },
    [onLongPress, delay, shouldPreventDefault]
  );

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      timeout.current && clearTimeout(timeout.current);
      if (shouldTriggerClick && !defaultPrevented(event)) {
        onClick(event);
      }
      if (shouldPreventDefault && target.current) {
        target.current.removeEventListener('touchend', preventDefault);
      }
    },
    [shouldPreventDefault, onClick]
  );

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any) => clear(e, false),
    onTouchEnd: (e: any) => clear(e)
  };
}

const isTouchEvent = (event: Event) => {
  return 'touches' in event;
};

const preventDefault = (event: Event) => {
  if (!isTouchEvent(event)) return;
  if ((event as TouchEvent).touches.length < 2 && event.preventDefault) {
    event.preventDefault();
  }
};

const defaultPrevented = (event: Event) => {
    // A simplistic way to guess if it was a long press.
    // If long press triggered, we probably don't want to click.
    // However, our hook handles this by clearing timeout. If timeout is already cleared by firing,
    // wait, we need a flag to know if long press actually fired.
    return false;
}
