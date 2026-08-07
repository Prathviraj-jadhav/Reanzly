"use client";

import { useEffect } from "react";
import { useCallStore } from "@/lib/store/call-store";
import { useChatStore } from "@/lib/store/chat-store";
import { Phone, PhoneOff, Video } from "lucide-react";

/**
 * Mounted once at the app-shell level so an incoming call surfaces
 * regardless of what the user is currently looking at - not scoped to
 * whichever chat panel/conversation happens to be open.
 *
 * Wires useCallStore's socket listeners as soon as the chat socket connects
 * (and re-wires on reconnect), and renders the incoming-call ringing card
 * when callStore.status === "incoming-ringing".
 */
export function IncomingCallOverlay() {
  const connected = useChatStore((s) => s.connected);
  const call = useCallStore();

  useEffect(() => {
    if (!connected) return;
    const detach = call.attachSocketListeners();
    return detach;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (call.status !== "incoming-ringing" || !call.incoming) return null;

  const { caller, type } = call.incoming;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-72 rounded-[8px] border border-border bg-card p-4 shadow-lg animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-[13px] font-semibold text-background">
          {caller.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold">{caller.name}</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {type === "video" ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
            <span>Incoming {type === "video" ? "video" : "voice"} call…</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => call.rejectIncoming()}
          className="tap flex flex-1 items-center justify-center gap-1.5 rounded-[6px] border border-border py-2 text-[12px] font-medium hover:bg-accent transition-colors"
        >
          <PhoneOff className="h-3.5 w-3.5" />
          Decline
        </button>
        <button
          onClick={() => call.acceptIncoming()}
          className="tap flex flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-foreground py-2 text-[12px] font-medium text-background hover:bg-foreground/90 transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          Accept
        </button>
      </div>
    </div>
  );
}
