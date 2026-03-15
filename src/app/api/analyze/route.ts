import { NextRequest, NextResponse } from "next/server";
import { analyzeConversation } from "@/lib/analysis";
import { Message } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { messages, userName, otherName } = await req.json() as {
      messages: Message[];
      userName: string;
      otherName: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages to analyze" },
        { status: 400 }
      );
    }

    const analysis = await analyzeConversation(messages, userName, otherName);
    return NextResponse.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Analysis error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
