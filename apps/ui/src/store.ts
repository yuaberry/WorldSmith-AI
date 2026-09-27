/** Global live state: WS event stream + status polling (+ web-demo flag). */
import { create } from "zustand";
import type { EventDto, StatusDto } from "./lib/api";

interface StudioState {
  ws: WebSocket | null;
  connected: boolean;
  demo: boolean;
  events: EventDto[];
  status: StatusDto | null;
  connect: () => void;
  refreshStatus: () => Promise<void>;
  pushEvent: (e: EventDto) => void;
}

export const useStudio = create<StudioState>((set, get) => ({
  ws: null,
  connected: false,
  demo: false,
  events: [],
  status: null,

  connect: () => {
    if (get().ws || get().demo) return; // web demo: no backend to connect
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => set({ connected: true });
    ws.onclose = () => {
      set({ connected: false });
      setTimeout(() => get().connect(), 2500); // auto-reconnect
    };
    ws.onmessage = (m) => {
      try {
        const msg = JSON.parse(m.data as string) as { type: string; event: EventDto };
        if (msg.type === "event") get().pushEvent(msg.event);
      } catch { /* malformed frame — ignore */ }
    };
    set({ ws });
  },

  refreshStatus: async () => {
    try {
      const { api } = await import("./lib/api");
      set({ status: await api.status() });
    } catch { /* server offline */ }
  },

  pushEvent: (e) => set((s) => ({ events: [e, ...s.events].slice(0, 250) })),
}));
