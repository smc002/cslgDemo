'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pointer } from 'lucide-react';
import { campaign, type Campaign } from '@/lib/campaign';
import { strongGuideStep } from '@/lib/strong-guide';
import './strong-guide.css';

type GuideRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  text: string;
  roaming: boolean;
  key: string;
};
export default function StrongGuide({
  data,
  mode,
  active,
}: {
  data: Campaign;
  mode: string;
  active: boolean;
}) {
  const step = strongGuideStep(data);
  const [rect, setRect] = useState<GuideRect | null>(null);
  const target = useRef<HTMLElement | null>(null);
  const skip = useRef<HTMLButtonElement | null>(null);
  const id = step?.id,
    targetName = step?.target,
    goalMode = step?.mode,
    message = step?.text,
    roaming = step?.roaming;
  useEffect(() => {
    if (!active || !id || !targetName) {
      setRect(null);
      return;
    }
    let scrolled = '';
    const update = () => {
      // Result dialogs and story cards retain normal modal focus and controls.
      if (document.querySelector('[data-slot="dialog-content"]')) {
        target.current = null;
        setRect(null);
        return;
      }
      const shell = document.querySelector('.mori-gameplay-shell');
      const nav = mode !== goalMode;
      let key = nav ? `nav-${goalMode}` : targetName;
      if (!nav && key.startsWith('city-site-')) {
        const build = key.replace('city-site-', 'city-build-');
        if (shell?.querySelector(`[data-guide="${build}"]`)) key = build;
      }
      const element = shell?.querySelector<HTMLElement>(
        `[data-guide="${key}"]`,
      );
      if (
        !element ||
        element.matches(':disabled') ||
        element.dataset.ready === 'false' ||
        getComputedStyle(element).visibility === 'hidden'
      ) {
        target.current = null;
        setRect(null);
        return;
      }
      if (key.startsWith('city-site-') && scrolled !== key) {
        element.scrollIntoView({ block: 'center', inline: 'nearest' });
        scrolled = key;
      }
      const r = element.getBoundingClientRect();
      const vw = window.innerWidth,
        vh = window.innerHeight;
      const left = Math.max(0, r.left - 5),
        top = Math.max(0, r.top - 5);
      const right = Math.min(vw, r.right + 5),
        bottom = Math.min(vh, r.bottom + 5);
      if (right <= left || bottom <= top) {
        target.current = null;
        setRect(null);
        return;
      }
      const next: GuideRect = {
        left,
        top,
        width: right - left,
        height: bottom - top,
        viewportWidth: vw,
        viewportHeight: vh,
        text: nav
          ? `点击${goalMode === 'merged' ? '搜刮' : goalMode === 'hunt' ? '猎场' : goalMode === 'recruit' ? '英雄' : '内城'}，继续下一步`
          : key.startsWith('city-build-')
            ? '点击「建造」，设施马上落地'
            : message!,
        roaming: !nav && !!roaming,
        key,
      };
      if (target.current !== element) {
        target.current = element;
        element.focus({ preventScroll: true });
      }
      setRect((old) =>
        JSON.stringify(old) === JSON.stringify(next) ? old : next,
      );
    };
    update();
    const timer = window.setInterval(update, 150);
    const keys = (e: KeyboardEvent) => {
      if (!target.current) return;
      if (document.activeElement?.closest('[data-gm-tools]')) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        (document.activeElement === target.current
          ? skip.current
          : target.current
        )?.focus({ preventScroll: true });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        skip.current?.click();
      }
    };
    window.addEventListener('keydown', keys, true);
    window.addEventListener('resize', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', keys, true);
      window.removeEventListener('resize', update);
      target.current = null;
    };
  }, [active, id, targetName, goalMode, message, roaming, mode]);
  if (!active || !step || !rect) return null;
  const {
    left,
    top,
    width,
    height,
    viewportWidth: vw,
    viewportHeight: vh,
  } = rect;
  const tipWidth = Math.min(290, vw - 24);
  const tipLeft = Math.max(
    12,
    Math.min(vw - tipWidth - 12, left + width / 2 - tipWidth / 2),
  );
  const tipTop = rect.roaming
    ? Math.max(12, top + height * 0.16)
    : top >= 116
      ? top - 105
      : Math.min(vh - 106, top + height + 16);
  const dismiss = () =>
    campaign.update((d) => {
      const mark = `guide-skip-${step.id}`;
      if (!d.prologue.seen.includes(mark)) d.prologue.seen.push(mark);
    });
  return createPortal(
    <div className="strong-guide" aria-label="新手操作引导">
      <div
        className="guide-block"
        style={{ left: 0, top: 0, width: vw, height: top }}
      />
      <div
        className="guide-block"
        style={{ left: 0, top, width: left, height }}
      />
      <div
        className="guide-block"
        style={{ left: left + width, top, width: vw - left - width, height }}
      />
      <div
        className="guide-block"
        style={{
          left: 0,
          top: top + height,
          width: vw,
          height: vh - top - height,
        }}
      />
      <div className="guide-focus" style={{ left, top, width, height }} />
      <div
        className="guide-tip"
        role="status"
        style={{ left: tipLeft, top: tipTop, width: tipWidth }}
      >
        <b>{rect.text}</b>
        <button ref={skip} onClick={dismiss}>
          跳过本步
        </button>
      </div>
      <div
        aria-hidden="true"
        className={`guide-hand ${rect.roaming ? 'is-roaming' : ''}`}
        style={{
          left: Math.min(vw - 52, left + width / 2),
          top: Math.min(vh - 64, top + height * (rect.roaming ? 0.53 : 0.62)),
        }}
      >
        <i />
        <Pointer size={52} strokeWidth={2} />
      </div>
    </div>,
    document.body,
  );
}
