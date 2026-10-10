'use client';

import { useEffect, useRef, useState } from 'react';

/** Review-only capture of the actual rendered combat canvases, without save edits. */
export default function CombatCapture() {
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  const start = () => {
    const source =
      document.querySelector<HTMLCanvasElement>('.hunt-page canvas');
    if (!source) {
      setError('等待战场加载完成');
      return;
    }
    const page = (source.closest('.mori-gameplay-shell') ??
      source.closest('.hunt-page'))!;
    const initial = page.getBoundingClientRect();
    const ratio = source.width / source.getBoundingClientRect().width;
    const output = document.createElement('canvas');
    output.width = Math.max(1, Math.round(initial.width * ratio));
    output.height = Math.max(1, Math.round(initial.height * ratio));
    const ctx = output.getContext('2d')!;
    const stream = output.captureStream(30);
    const mimeType = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      stream.getTracks().forEach((track) => track.stop());
      setError('浏览器不支持录制');
      return;
    }
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6000000,
    });
    const chunks: Blob[] = [];
    let frame = 0;
    const paint = () => {
      const rect = page.getBoundingClientRect();
      ctx.clearRect(0, 0, output.width, output.height);
      const layers = [
        source,
        ...page.querySelectorAll<HTMLCanvasElement>(
          ':scope > canvas[aria-hidden="true"], .hunt-page > canvas[aria-hidden="true"]',
        ),
      ];
      for (const layer of layers) {
        if (getComputedStyle(layer).display === 'none') continue;
        const r = layer.getBoundingClientRect();
        ctx.drawImage(
          layer,
          ((r.left - rect.left) / rect.width) * output.width,
          ((r.top - rect.top) / rect.height) * output.height,
          (r.width / rect.width) * output.width,
          (r.height / rect.height) * output.height,
        );
      }
      frame = requestAnimationFrame(paint);
    };
    const finish = () => {
      if (recorder.state === 'recording') recorder.stop();
    };
    const timer = window.setTimeout(finish, 60000);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      setUrl(URL.createObjectURL(new Blob(chunks, { type: mimeType })));
      stop.current = null;
    };
    stop.current = finish;
    setError('');
    setUrl('');
    paint();
    recorder.start(1000);
    setRecording(true);
  };
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        padding: '6px 0',
        fontSize: 12,
      }}
    >
      <button
        style={{
          padding: '7px 10px',
          borderRadius: 6,
          background: recording ? '#9b4032' : '#36574b',
          color: '#fff',
        }}
        onClick={() => (recording ? stop.current?.() : start())}
      >
        {recording ? '停止录制' : '录制战斗画布（60秒）'}
      </button>
      {url && (
        <a href={url} download="hunt-combat-capture.webm">
          下载战斗录屏
        </a>
      )}
      <span>
        {recording ? '录制中 · 可正常操作' : '画布原画面 · 不含网页按钮和音频'}
      </span>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
