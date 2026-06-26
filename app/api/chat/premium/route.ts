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
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        'あなたはWeb開発の質問に答えるボットです（プレミアム会員向け）。詳細な回答を提供してください。です・ます調で統一してください。',
      messages,
    }),
  });

  const data = await response.json();
  return NextResponse.json({ reply: data.content[0].text });
}
