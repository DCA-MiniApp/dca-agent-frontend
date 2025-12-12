import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(
  req: Request,
  context: { params: Promise<{ address: string }> }
) {
  // Await async params
  const { address } = await context.params;

  if (!address) {
    return NextResponse.json(
      { success: false, message: "Missing address" },
      { status: 400 }
    );
  }

  // Extract search params
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get("limit") || "50";
  const offset = searchParams.get("offset") || "0";

  try {
    // Build URL to backend
    const url = `${API_BASE_URL}/api/dca/user/${address}/history?limit=${limit}&offset=${offset}`;

    // Secure backend call with API key (safe on server)
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Access-Key": process.env.API_ACCESS_KEY || "",
      },
      cache: "no-store",
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Proxy Execution History Error:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching execution history" },
      { status: 500 }
    );
  }
}
