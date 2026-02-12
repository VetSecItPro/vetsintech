import { NextResponse } from "next/server";
import { getPublicPortfolio } from "@/lib/domains/portfolio/queries";

/**
 * GET /api/portfolio/[username] — get public portfolio data (no auth required)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "Invalid username" },
        { status: 400 }
      );
    }

    const portfolio = await getPublicPortfolio(username);

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found or is private" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: portfolio }, { status: 200 });
  } catch (error) {
    console.error("GET /api/portfolio/[username] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
