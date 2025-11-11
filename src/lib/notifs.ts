import {
  SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/miniapp-sdk";
import { getUserNotificationDetails } from "~/lib/kv";
import { APP_URL } from "./constants";

type SendMiniAppNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendMiniAppNotification({
  fid,
  title,
  body,
}: {
  fid: number;
  title: string;
  body: string;
}): Promise<SendMiniAppNotificationResult> {
  const notificationDetails = await getUserNotificationDetails(fid);
  console.log("notificationDetails", notificationDetails);
  if (!notificationDetails) {
    return { state: "no_token" };
  }

  const response = await fetch(notificationDetails.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notificationId: crypto.randomUUID(),
      title,
      body,
      targetUrl: 'https://dca.lamprosdao.com',
      tokens: [notificationDetails.token],
    } satisfies SendNotificationRequest),
  });

  const responseJson = await response.json();
  console.log("Notification send response on notifs:", response.status, responseJson);
  if (response.status === 200) {
    const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
    // console.log("responseBody", responseBody);
    console.log("Saving notification token and flag calling..");

    // Call your API to persist notification details
    const saveRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/dca/token-notification`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: String(fid),  // string
          notificationtoken: notificationDetails.token, // string
          notificationurl: notificationDetails.url, // string
          isNotification:true
        }),
      }
    );

    if (!saveRes.ok) {
      const err = await saveRes.text().catch(() => "");
      console.warn("Failed to save notification details:", err);
    } else {
      console.log("Notification details saved.",notificationDetails.token);
    }

    if (responseBody.success === false) {
      // Malformed response
      return { state: "error", error: responseBody.error.errors };
    }

    if (responseBody.data.result.rateLimitedTokens.length) {
      // Rate limited
      return { state: "rate_limit" };
    }

    return { state: "success" };
  } else {
    // Error response
    console.error("Notification send error:", response.status, responseJson);
    return { state: "error", error: responseJson };
  }
}
