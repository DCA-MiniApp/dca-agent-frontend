import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Incoming payload from your backend when a transaction status changes
const TxEventSchema = z.object({
  // Farcaster user fid to notify (preferred), or provide userAddress and map on server if needed
  fid: z.number().int().positive().optional(),
  userAddress: z.string().optional(),

  // Transaction context
  status: z.enum(["pending", "success", "failed"]),
  txHash: z.string().optional(),
  chainId: z.string().optional(),
  planId: z.string().optional(),
  reason: z.string().optional(),
  // Optional: human text already prepared by backend
  message: z.string().optional(),
  notificationtoken: z.string().optional(),
  notification_url: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = TxEventSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }


    const {
      fid,
      userAddress,
      status,
      txHash,
      chainId,
      planId,
      reason,
      message,
      notificationtoken,
      notification_url,
    } = parsed.data;

    // Only notify on failures per requirement
    if (status !== "failed") {
      return NextResponse.json({ success: true, skipped: true });
    }

    if (!fid) {
      // If fid mapping is not provided, you can look it up by userAddress here.
      // For now, require fid to be present to send notification.
      return NextResponse.json(
        {
          success: false,
          error: "Missing fid. Provide fid or implement address->fid mapping.",
        },
        { status: 400 }
      );
    }

    const shortHash = txHash
      ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}`
      : "N/A";
    const planLine = planId ? `Plan: ${planId}` : undefined;
    const chainLine = chainId ? `Chain: ${chainId}` : undefined;

    const composed =
      message ||
      [
        "❌ Transaction Failed",
        planLine,
        chainLine,
        `Tx: ${shortHash}`,
        reason ? `Reason: ${reason}` : undefined,
        "",
        "Open the app to retry or view details.",
      ]
        .filter(Boolean)
        .join("\n");

    // Store details as { url, token } or null
    const details: { url: string; token: string } | null =
      notificationtoken && notification_url
        ? { url: notification_url, token: notificationtoken }
        : null;

    // Forward to existing notification endpoint
    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/send-notification`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          title: "Transaction Failed",
          body: composed,
          notificationDetails:details,
        }),
      }
    );


    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: "Failed to send notification", details: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[tx-events] error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
