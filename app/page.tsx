'use client';

import { useEffect, useState, useRef } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

async function saveUserToFirestore(user: User) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

async function getDashboardPath(uid: string): Promise<string | null> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const plan = userSnap.data()?.plan;
  if (plan === 'member') return '/member/dashboard';
  if (plan === 'premium') return '/premium/dashboard';
  return null;
}

async function redirectAfterLogin(user: User): Promise<boolean> {
  const idToken = await user.getIdToken();
  document.cookie = `token=${idToken}; path=/; SameSite=Strict`;
  const path = await getDashboardPath(user.uid);
  if (!path) return false;
  window.location.href = path;
  return true;
}

export default function HomePage() {
  const [status, setStatus] = useState('確認中...');
  const [errorMessage, setErrorMessage] = useState('');
  const popupInProgress = useRef(false);

  // ページ読み込み時にログイン済みなら即遷移（ポップアップ操作中は介入しない）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !popupInProgress.current) {
        const redirected = await redirectAfterLogin(user);
        if (!redirected) {
          setStatus('プランが設定されていません');
        }
      } else if (!user) {
        setStatus('未ログイン');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    if (popupInProgress.current) return;
    popupInProgress.current = true;
    setErrorMessage('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await saveUserToFirestore(result.user);
      const redirected = await redirectAfterLogin(result.user);
      if (!redirected) {
        popupInProgress.current = false;
        setErrorMessage('プランが設定されていません');
      }
    } catch (error: unknown) {
      popupInProgress.current = false;
      const code = (error as { code?: string }).code ?? 'unknown';
      console.error('[signInWithPopup error]', error);
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setErrorMessage(`ログインに失敗しました (${code})`);
      }
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 p-6 shadow-sm">
        <h1 className="mb-4 text-center text-xl font-semibold">Firebase Chat</h1>
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={status === '確認中...'}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Googleでログイン
        </button>
        {errorMessage && (
          <p className="mt-3 text-center text-sm text-red-600">{errorMessage}</p>
        )}
      </div>
    </main>
  );
}
