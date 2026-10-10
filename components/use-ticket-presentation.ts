'use client';
import { useEffect, useRef, useState } from 'react';
import { campaign } from '@/lib/campaign';
import type { CoreAward } from '@/lib/core-rewards';

export type TicketPresentation = {
  id: number;
  amount: number;
  core?: CoreAward;
  arrived?: boolean;
  pendingCore?: number;
};
export const TICKET_PRESENTATION_MS = 1600;
export const TICKET_ARRIVAL_MS = 1050;

/** Bounded visual queue. Rewards are already committed; this never pays them. */
export function useTicketPresentation(reviewAge?: number) {
  const hold = reviewAge !== undefined;
  const holdRef = useRef(hold);
  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);
  const [active, setActive] = useState<TicketPresentation | null>(null);
  const [pendingCore, setPendingCore] = useState(0);
  useEffect(() => {
    let id = 0,
      timer = 0;
    const queue: TicketPresentation[] = [];
    const finish = () => {
      if (holdRef.current) timer = window.setTimeout(finish, 100);
      else next();
    };
    const next = () => {
      const item = queue.shift() ?? null;
      setActive(item);
      if (!item) {
        timer = 0;
        return;
      }
      const arrive = () => {
        if (holdRef.current) {
          timer = window.setTimeout(arrive, 100);
          return;
        }
        if (item.core) setPendingCore((n) => Math.max(0, n - item.amount));
        setActive({ ...item, arrived: true });
        timer = window.setTimeout(
          finish,
          TICKET_PRESENTATION_MS - TICKET_ARRIVAL_MS,
        );
      };
      timer = window.setTimeout(arrive, TICKET_ARRIVAL_MS);
    };
    const unsubscribe = campaign.subscribeTicketRewards((_amount, source) => {
      const items: TicketPresentation[] = [];
      if (source.core)
        items.push({ id: ++id, amount: source.core.amount, core: source.core });
      if (source.core) setPendingCore((n) => n + source.core!.amount);
      if (source.other > 0) items.push({ id: ++id, amount: source.other });
      for (const item of items) {
        const pending = queue.find((p) => !!p.core === !!item.core);
        if (pending) pending.amount += item.amount;
        else queue.push(item);
      }
      if (!timer) next();
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
  if (!active) return null;
  const previewArrived =
    reviewAge !== undefined && reviewAge * 1000 >= TICKET_ARRIVAL_MS;
  return {
    ...active,
    arrived: reviewAge !== undefined ? previewArrived : active.arrived,
    pendingCore: Math.max(
      0,
      pendingCore -
        (previewArrived && !active.arrived && active.core ? active.amount : 0),
    ),
  };
}
