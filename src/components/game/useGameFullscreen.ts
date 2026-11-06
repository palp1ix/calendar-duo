import {useEffect, useRef, useState, type RefObject} from 'react';

type LockableOrientation = ScreenOrientation & {lock?: (orientation: 'landscape') => Promise<void>};
export function useGameFullscreen(root: RefObject<HTMLDivElement>) {
  const [expanded, setExpanded] = useState(false), [hint, setHint] = useState('');
  const desired = useRef(false), nativeSession = useRef(false), mounted = useRef(true);
  async function enter() {
    const element = root.current;
    if (!element) return;
    desired.current=true;setExpanded(true); setHint('');
    try {
      if (!element.requestFullscreen) throw new Error('unsupported');
      await element.requestFullscreen();
      if (!mounted.current || !desired.current) { if (document.fullscreenElement === element) await document.exitFullscreen(); return; }
      nativeSession.current = true;
      try {await (screen.orientation as LockableOrientation)?.lock?.('landscape');if(!mounted.current||!desired.current)screen.orientation?.unlock?.();} catch { /* Browser may require a physical rotation. */ }
    } catch {
      if (mounted.current) setHint('Игра развёрнута в окне браузера. Для широкого вида поверните телефон.');
    }
  }
  function exit() {
    desired.current=false;setExpanded(false);
    if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(()=>{});
    if (nativeSession.current) screen.orientation?.unlock?.();
    nativeSession.current = false;
  }
  useEffect(() => {
    mounted.current = true;
    const element=root.current;
    const changed = () => {
      if (nativeSession.current && document.fullscreenElement !== root.current) {
        desired.current=false;nativeSession.current = false; screen.orientation?.unlock?.(); setExpanded(false);
      }
    };
    document.addEventListener('fullscreenchange', changed);
    return () => {
      mounted.current = false;desired.current=false;
      document.removeEventListener('fullscreenchange', changed);
      if (nativeSession.current) screen.orientation?.unlock?.();
      if (element && document.fullscreenElement === element) void document.exitFullscreen().catch(()=>{});
    };
  }, [root]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.querySelector<HTMLButtonElement>('.game-expand')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exit();
      if(event.key === 'Tab') {
        const buttons = [...(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]') || [])].filter(el=>el.getClientRects().length);
        const first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
      }
    };
    document.addEventListener('keydown', key);
    return () => {document.body.style.overflow = overflow;document.removeEventListener('keydown', key);previous?.focus();};
  }, [expanded]);
  return {expanded, hint, enter, exit};
}
