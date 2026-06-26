'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import ChatBot from '@/components/ChatBot';

export default function MemberDashboard() {
  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = 'token=; path=/; max-age=0';
    window.location.href = '/';
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center p-4">
      <button
        type="button"
        onClick={handleLogout}
        className="fixed right-4 top-4 z-50 rounded px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
      >
        ログアウト
      </button>
      <h1 className="mb-4 text-2xl font-semibold">メンバーダッシュボード</h1>
      <ChatBot apiEndpoint="/api/chat/member" />
    </div>
  );
}
