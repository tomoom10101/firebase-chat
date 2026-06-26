'use client';

import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Dashboard() {
  const handleLogout = async () => {
    await signOut(auth);
    document.cookie = 'token=; path=/; max-age=0';
    window.location.href = '/';
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-6">ダッシュボード</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}
