import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(req: Request) {
  try {
    // Read incoming headers
    const isHome = req.headers.get("ishome") || "false";

    // Call backend with forwarded + secure headers
    const response = await fetch(`${API_BASE_URL}/api/dca/platform-stats`, {
      headers: {
        Accept: "application/json",
        ishome: isHome,                              
        "Access-Key": process.env.API_ACCESS_KEY || "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to fetch platform stats" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Proxy Platform Stats Error:", error);
    return NextResponse.json(
      { success: false, message: "Error fetching platform stats" },
      { status: 500 }
    );
  }
}
