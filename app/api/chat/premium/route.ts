import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let messages: Anthropic.MessageParam[];
  try {
    ({ messages } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system:
        'あなたはWeb開発の質問に答えるボットです（プレミアム会員向け）。詳細な回答を提供してください。です・ます調で統一してください。',
      messages,
    });

    const block = response.content[0];
    const text = block?.type === 'text' ? block.text : null;
    if (!text) {
      return NextResponse.json({ error: 'No text response from Anthropic' }, { status: 500 });
    }

    return NextResponse.json({ reply: text });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to reach Anthropic API: ${message}` }, { status: 500 });
  }
}
