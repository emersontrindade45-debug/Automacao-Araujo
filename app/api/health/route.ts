import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const start = Date.now();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("clientes").select("id").limit(1);

    if (error) throw error;

    return NextResponse.json({
      status: "ok",
      db: "connected",
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        error: err instanceof Error ? err.message : "unknown",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
