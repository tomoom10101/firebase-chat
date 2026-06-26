import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'あなたはWeb開発の質問に答えるボットです（通常会員向け）。回答は300文字以内にまとめてください。です・ます調で統一してください。',
      messages,
    }),
  });

  const data = await response.json();
  return NextResponse.json({ reply: data.content[0].text });
}
