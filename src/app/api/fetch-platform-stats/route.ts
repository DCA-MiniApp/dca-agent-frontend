import { NextResponse } from "next/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET() {
  try {
    // Build URL to backend
    const url = `${API_BASE_URL}/api/dca/platform-stats`;

    // Call real backend with secure API key
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Access-Key": process.env.API_ACCESS_KEY || "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch platform stats",
        },
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
