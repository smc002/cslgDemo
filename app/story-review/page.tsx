'use client';
import { useState } from 'react';
import Link from 'next/link';
import { STORIES } from '@/lib/prologue';
import { StoryContent } from '@/components/prologue';
export default function StoryReview() {
  const [chapter, setChapter] = useState(1);
  const story = STORIES[chapter];
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#e9ede2',
        padding: '24px 12px',
        fontFamily: 'Microsoft YaHei,sans-serif',
        color: '#254941',
      }}
    >
      <header style={{ maxWidth: 1050, margin: '0 auto 20px' }}>
        <small>曙光营地 · 剧情与角色校对</small>
        <h1 style={{ fontSize: 26, margin: '10px 0' }}>
          九位伙伴，回到同一个家
        </h1>
        <p>
          贾伟思负责主线通讯；玩家是队长。立绘与战斗、招募共用同一套角色资源。
        </p>
        <Link href="/#merged">进入游戏</Link> ·{' '}
        <Link href="/art-review">美术总览</Link>
      </header>
      <div
        style={{
          maxWidth: 1050,
          margin: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
        <nav
          aria-label="选择剧情章节"
          style={{ display: 'grid', gap: 8, width: 260 }}
        >
          {STORIES.map((s, i) => (
            <button
              key={s.id}
              aria-pressed={chapter === i}
              onClick={() => setChapter(i)}
              style={{
                textAlign: 'left',
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid #b8c6ab',
                background: chapter === i ? '#285c50' : '#fff9e9',
                color: chapter === i ? 'white' : '#254941',
              }}
            >
              {String(i + 1).padStart(2, '0')} · {s.title}
            </button>
          ))}
        </nav>
        <article
          className="prologue-story"
          style={{ position: 'relative', flexShrink: 0 }}
          data-story={story.id}
        >
          <StoryContent
            story={story}
            inDialog={false}
            onContinue={() => setChapter((chapter + 1) % STORIES.length)}
          />
        </article>
      </div>
    </main>
  );
}
