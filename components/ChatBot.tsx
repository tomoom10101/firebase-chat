'use client';

import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatBotProps = {
  apiEndpoint: string;
};

export default function ChatBot({ apiEndpoint }: ChatBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages }),
    });

    const data = await res.json();
    setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-4 h-[500px] space-y-2 overflow-y-auto rounded border p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`inline-block max-w-[80%] rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'ml-auto bg-blue-500 text-white'
                  : 'bg-gray-200 text-black'
              }`}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && <div className="text-gray-400">返答中...</div>}
      </div>

      <div className="flex gap-2">
        <textarea
          className="flex-1 resize-none rounded border px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === 'Enter' &&
            !e.nativeEvent.isComposing &&
            !e.shiftKey &&
            sendMessage()
          }
          placeholder="メッセージを入力..."
          rows={3}
        />
        <button
          className="rounded bg-blue-500 px-4 py-2 text-white"
          onClick={sendMessage}
        >
          送信
        </button>
      </div>
    </div>
  );
}
