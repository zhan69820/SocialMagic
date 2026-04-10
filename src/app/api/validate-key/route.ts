import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { createDynamicProvider } from "@/lib/services/generator.service";
import type { ProviderType } from "@/types/index";

interface ValidateKeyBody {
  provider: ProviderType;
  apiKey: string;
  model: string;
  baseURL?: string;
}

export async function POST(request: NextRequest) {
  let body: ValidateKeyBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: "请求体不是有效的 JSON" }, { status: 400 });
  }

  const { provider, apiKey, model, baseURL } = body;

  if (!provider || !apiKey || !model) {
    return NextResponse.json({ valid: false, error: "缺少必填参数" }, { status: 400 });
  }

  try {
    const aiModel = createDynamicProvider({ provider, apiKey, model, baseURL });

    await generateText({
      model: aiModel,
      prompt: "回复「OK」",
      maxOutputTokens: 5,
    });

    return NextResponse.json({ valid: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ valid: false, error: `验证失败: ${message}` });
  }
}
