import { NextRequest, NextResponse } from "next/server";
import { refreshAll } from "@/lib/refresh";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Körs av Vercel Cron varje timme. Failar tyst om FPL är nere –
 *  förra snapshoten ligger då kvar och sajten fortsätter fungera. */
export async function GET(request: NextRequest) {
  // Vercel Cron skickar CRON_SECRET som Bearer om den är satt; annars öppen (privat kompissajt)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await refreshAll();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Okänt fel" },
      { status: 200 } // aldrig krascha cron-jobbet
    );
  }
}
