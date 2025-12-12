import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ;
export async function GET(req: Request, context: { params: Promise<{ address: string }> }) {
  const { address } = await context.params; // ⬅ FIX

  if (!address) {
    return NextResponse.json({ success: false, message: "Missing address" }, { status: 400 });
  }

  try {
    // Call REAL backend with the secure key
    const response = await fetch(`${API_BASE_URL}/api/dca/plans/${address}`, {
      headers: {
        "Accept": "application/json",
        "Access-Key": process.env.API_ACCESS_KEY || ""
      }
    });

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Proxy DCA Error:", error);
    return NextResponse.json({ success: false, message: "Error fetching plans" }, { status: 500 });
  }
}
