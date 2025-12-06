import { useState, useEffect, useCallback, useRef } from "react";
import sdk, { AddMiniApp, MiniAppNotificationDetails, type Context } from "@farcaster/miniapp-sdk";

export function useSDK() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.MiniAppContext>();
  const [notificationDetails, setNotificationDetails] = useState<MiniAppNotificationDetails | null>(null);
  const [added, setAdded] = useState(false);
  const [lastEvent, setLastEvent] = useState("");
  const [addFrameResult, setAddFrameResult] = useState("");
  const [isNotificationResolving, setIsNotificationResolving] = useState(true);

  const latestNotifDetailsRef = useRef(notificationDetails);
  const autoRequestRef = useRef(false);
  const addedRef = useRef(added);
  const detailsRef = useRef(notificationDetails);

  useEffect(() => {
    latestNotifDetailsRef.current = notificationDetails;
  }, [notificationDetails]);

  useEffect(() => {
    addedRef.current = added;
  }, [added]);

  useEffect(() => {
    detailsRef.current = notificationDetails;
  }, [notificationDetails]);

  const waitForNotificationDetails = useCallback(
    async (timeoutMs = 5000, intervalMs = 200) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (latestNotifDetailsRef.current) return latestNotifDetailsRef.current;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return null;
    },
    []
  );

  const addFrame = useCallback(async () => {
    try {
      setNotificationDetails(null);
      const result = await sdk.actions.addFrame();

      if (result.notificationDetails) {
        setNotificationDetails(result.notificationDetails);
      }

      setAddFrameResult(
        result.notificationDetails
          ? `Added, got notificaton token ${result.notificationDetails.token} and url ${result.notificationDetails.url}`
          : "Added, got no notification details"
      );

      if (result.notificationDetails) {
        const ctx = await sdk.context;
        const fidCandidate = ctx.user?.fid;
        const fid =
          typeof fidCandidate === "string"
            ? Number(fidCandidate)
            : fidCandidate;
        if (typeof fid === "number" && !Number.isNaN(fid)) {
          await handleNotification(fid as number, result.notificationDetails);
        }
      } else {
        console.log("User added mini app without enabling notifications.");
      }
    } catch (error) {
      if (error instanceof AddMiniApp.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddMiniApp.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

  const handleNotification = async (
    fidParam?: number,
    detailsParam?: MiniAppNotificationDetails | null
  ) => {
    try {
      setIsNotificationResolving(true);

      const ctx = await sdk.context;
      const fid = ctx.user?.fid;
      const details = detailsParam ?? notificationDetails ?? null;
      if (!fid) {
        setIsNotificationResolving(false);
        return;
      }

      const response = await fetch("/api/send-notification", {
        method: "POST",
        mode: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          notificationDetails: details,
          title: "Welcome to DCA Agent 🥳",
          body: "We'll keep you updated on your plan performance.🔔",
        }),
      });
      await response.json().catch(() => null);
      setIsNotificationResolving(false);
    } catch (err) {
      console.log("Error enabling notifications:", err);
      setIsNotificationResolving(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      setContext(context);
      setAdded(context.client.added);

      sdk.on("miniAppAdded", ({ notificationDetails }) => {
        setLastEvent(
          `miniAppAdded${!!notificationDetails ? ", notifications enabled" : ""}`
        );
        setAdded(true);
        console.log("Mini app added!");
        if (notificationDetails) {
          setNotificationDetails(notificationDetails);
        }
      });

      sdk.on("miniAppAddRejected", ({ reason }) => {
        setLastEvent(`miniAppAddRejected, reason ${reason}`);
      });

      sdk.on("miniAppRemoved", () => {
        setLastEvent("miniAppRemoved");
        setAdded(false);
        setNotificationDetails(null);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        setLastEvent("notificationsEnabled");
        setNotificationDetails(notificationDetails);
      });

      sdk.on("notificationsDisabled", () => {
        setLastEvent("notificationsDisabled");
        setNotificationDetails(null);
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      const ethereumProvider = await sdk.wallet.getEthereumProvider();
      ethereumProvider?.on("chainChanged", (chainId) => {
        // console.log("[ethereumProvider] chainChanged", chainId);
      });
      ethereumProvider?.on("connect", (connectInfo) => {
        console.log("[ethereumProvider] connect", connectInfo);
      });

      sdk.actions.ready({});
    };

    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded]);

  useEffect(() => {
    if (!isSDKLoaded) {
      setIsNotificationResolving(true);
      return;
    }
    const enabledNow = !!(added && notificationDetails);
    setIsNotificationResolving(false);
    if (!enabledNow) {
      autoRequestRef.current = false;
    }
  }, [isSDKLoaded, added, notificationDetails]);

  useEffect(() => {
    if (!isSDKLoaded) return;
    if (autoRequestRef.current) return;
    if (added && notificationDetails) return;
    autoRequestRef.current = true;
    (async () => {
      try {
        setIsNotificationResolving(true);
        if ((await sdk.context).client.added) {
          console.log("frame added to client.");
        } else {
          await addFrame();
        }
        setIsNotificationResolving(false);
      } catch (err) {
        console.log("Error auto-adding mini app:", err);
        setIsNotificationResolving(false);
      }
    })();
  }, [isSDKLoaded, added, notificationDetails, addFrame]);

  return {
    isSDKLoaded,
    context,
    notificationDetails,
    added,
    lastEvent,
    addFrameResult,
    isNotificationResolving,
    waitForNotificationDetails,
    addFrame,
    handleNotification,
  };
}
