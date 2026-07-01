'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import ChatBot from '@/components/ChatBot';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function PremiumDashboard() {
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const q = query(
        collection(db, 'users', user.uid, 'chatHistory'),
        orderBy('createdAt', 'asc'),
      );
      const snapshot = await getDocs(q);
      const msgs: Message[] = snapshot.docs.map((doc) => ({
        role: doc.data().role as 'user' | 'assistant',
        content: doc.data().content as string,
      }));
      setInitialMessages(msgs);
    });
    return () => unsubscribe();
  }, []);

  const saveMessage = async (message: Message) => {
    if (!uid) return;
    await addDoc(collection(db, 'users', uid, 'chatHistory'), {
      role: message.role,
      content: message.content,
      createdAt: serverTimestamp(),
    });
  };

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
      <h1 className="mb-4 text-2xl font-semibold">プレミアムダッシュボード</h1>
      <ChatBot
        apiEndpoint="/api/chat/premium"
        initialMessages={initialMessages}
        onSaveMessage={saveMessage}
      />
    </div>
  );
}
