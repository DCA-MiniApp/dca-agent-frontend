import { notificationDetailsSchema } from "@farcaster/miniapp-sdk";
import { NextRequest } from "next/server";
import { z } from "zod";
import { setUserNotificationDetails } from "~/lib/kv";
import { sendMiniAppNotification } from "~/lib/notifs";
import { sendNeynarMiniAppNotification } from "~/lib/neynar";

const requestSchema = z.object({
  fid: z.number(),
  notificationDetails: notificationDetailsSchema.optional(),
  title: z.string().optional(),
  body: z.string().optional(),
});

export async function POST(request: NextRequest) {
  // If Neynar is enabled, we don't need to store notification details
  // as they will be managed by Neynar's system
  const neynarEnabled = process.env.NEYNAR_API_KEY && process.env.NEYNAR_CLIENT_ID;

  const requestJson = await request.json();
  const requestBody = requestSchema.safeParse(requestJson);

  if (requestBody.success === false) {
    return Response.json(
      { success: false, errors: requestBody.error.errors },
      { status: 400 }
    );
  }

  console.log('Received notification request for fid:', requestBody.data.fid);
  console.log('Neynar enabled:', neynarEnabled);
  console.log('Notification details provided:', !!requestBody.data.notificationDetails);

  // Only store notification details if not using Neynar
  if (!neynarEnabled) {
    // When not using Neynar, client must provide notificationDetails once approved on client side
    if (!requestBody.data.notificationDetails) {
      return Response.json(
        {
          success: false,
          error:
            "Missing notificationDetails. Ask client to grant notifications (addMiniApp) first.",
        },
        { status: 400 }
      );
    }
    await setUserNotificationDetails(
      Number(requestBody.data.fid),
      requestBody.data.notificationDetails
    );
  }

  // Use appropriate notification function based on Neynar status
  const sendNotification = neynarEnabled ? sendNeynarMiniAppNotification : sendMiniAppNotification;
  const sendResult = await sendNotification({
    fid: Number(requestBody.data.fid),
    title: requestBody.data.title ?? "",
    body:
      requestBody.data.body ??
      "",
  });

  console.log('Notification send result:', sendResult);

  if (sendResult.state === "error") {
    return Response.json(
      { success: false, neynarEnabled: !!neynarEnabled, result: sendResult },
      { status: 500 }
    );
  } else if (sendResult.state === "rate_limit") {
    return Response.json(
      { success: false, neynarEnabled: !!neynarEnabled, result: sendResult },
      { status: 429 }
    );
  }

  return Response.json({ success: true, neynarEnabled: !!neynarEnabled, result: sendResult });
}
