'use client';

import { useState } from 'react';
import { campaign } from '@/lib/campaign';

export default function GmAmmoControl({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('1000');
  const [message, setMessage] = useState('');
  return (
    <div className={`gm-ammo-control ${open ? 'expanded' : ''}`}>
      <button
        disabled={disabled}
        aria-expanded={open}
        aria-controls="gm-ammo-panel"
        onClick={() => setOpen(!open)}
      >
        增加黑金弹
      </button>
      {open && (
        <form
          id="gm-ammo-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const count = Number(amount);
            if (!Number.isSafeInteger(count) || count < 1 || count > 1000000) {
              setMessage('请输入 1–1000000 的整数');
              return;
            }
            if (!Number.isSafeInteger(campaign.read().ammo + count)) {
              setMessage('黑金弹数量已达上限');
              return;
            }
            const added = campaign.update((d) => {
              d.ammo += count;
            });
            setMessage(added ? `已增加 ${count} 发 · 当前 ${campaign.read().ammo} 发` : '存档被其他标签页占用');
          }}
        >
          <label htmlFor="gm-ammo-amount">增加数量</label>
          <input
            id="gm-ammo-amount"
            type="number"
            inputMode="numeric"
            min="1"
            max="1000000"
            step="1"
            required
            value={amount}
            onChange={(event) => { setAmount(event.target.value); setMessage(''); }}
          />
          <button type="submit" disabled={disabled}>立即增加</button>
          <output aria-live="polite">{message}</output>
        </form>
      )}
    </div>
  );
}
