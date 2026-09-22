import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'MORI · 末日交汇', description:'集结幸存者，向废土深处推进。', icons:{icon:'/favicon.svg'} };
export const viewport: Viewport = {width:'device-width',initialScale:1};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="zh-CN"><body>{children}</body></html>;}
