import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TxEventSchema = z.object({
  fid: z.number().int().positive().optional(),
  userAddress: z.string().optional(),

  // Transaction / job context
  status: z.enum(["pending", "success", "failed", "low-balance"]),
  txHash: z.string().optional(),
  chainId: z.string().optional(),
  planId: z.string().optional(),
  reason: z.string().optional(),
  taskId: z.number().int().positive().optional(),

  // Low-balance specific (from backend)
  jobCostPrediction: z.number().optional(),
  totalTaskCost: z.number().optional(),
  percentageUsed: z.number().optional(),

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

    console.log("[tx-events] received payload:", json);

    const {
      fid,
      userAddress,
      status,
      txHash,
      chainId,
      planId,
      reason,
      message,
      taskId,
      notificationtoken,
      notification_url,
      jobCostPrediction,
      totalTaskCost,
      percentageUsed,
    } = parsed.data;

    if (!fid) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing fid. Provide fid or implement address->fid mapping.",
        },
        { status: 400 }
      );
    }

    // Build notification content based on status
    let title: string;
    let body: string;

    if (status === "failed") {
      const composed =
        message ??
        `Open your History tab, search the ${taskId} task ID, and check what went wrong to keep your plan running smoothly.`;
      title = "Plan execution failed ⚠️";
      body = composed;
    } else if (status === "low-balance") {
      const pct = percentageUsed != null ? percentageUsed.toFixed(2) : "70+";
      title = "Deposit balance running low ⚠️";
      body =reason ??
        `Your Triggered Jobs have used ${pct}% of your TG balance. Consider topping up to ensure uninterrupted plan execution. Job Cost Prediction: ${jobCostPrediction}, Total Task Cost: ${totalTaskCost}.`;
    } else {
      // For pending/success or anything else we don't notify
      return NextResponse.json({ success: true, skipped: true });
    }

    const details: { url: string; token: string } | null =
      notificationtoken && notification_url
        ? { url: notification_url, token: notificationtoken }
        : null;

    const resp = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/send-notification`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          title,
          body,
          notificationDetails: details,
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