import { create } from "zustand";

interface WarehouseState {
  skus: any[];
  shipmentsIn: any[];
  shipmentsOut: any[];
  locations: any[];
  receives: any[];
  pickLists: any[];
  counts: any[];
  crossDocks: any[];
  returns: any[];
  yards: any[];
  dockAppts: any[];
  loading: boolean;
  
  fetchSkus: () => Promise<void>;
  createSku: (data: any) => Promise<any>;
  updateSku: (id: string, data: any) => Promise<any>;

  fetchInbounds: () => Promise<void>;
  createInbound: (data: any) => Promise<any>;
  updateInbound: (id: string, data: any) => Promise<any>;

  fetchOutbounds: () => Promise<void>;
  createOutbound: (data: any) => Promise<any>;
  updateOutbound: (id: string, data: any) => Promise<any>;

  fetchLocations: () => Promise<void>;
  createLocation: (data: any) => Promise<any>;
  updateLocation: (id: string, data: any) => Promise<any>;

  fetchPodReceives: () => Promise<void>;
  createPodReceive: (data: any) => Promise<any>;
  updatePodReceive: (id: string, data: any) => Promise<any>;

  fetchPickLists: () => Promise<void>;
  createPickList: (data: any) => Promise<any>;
  updatePickList: (id: string, data: any) => Promise<any>;

  fetchCounts: () => Promise<void>;
  createCount: (data: any) => Promise<any>;
  updateCount: (id: string, data: any) => Promise<any>;

  fetchCrossDocks: () => Promise<void>;
  createCrossDock: (data: any) => Promise<any>;
  updateCrossDock: (id: string, data: any) => Promise<any>;

  fetchReturns: () => Promise<void>;
  createReturn: (data: any) => Promise<any>;
  updateReturn: (id: string, data: any) => Promise<any>;

  fetchYards: () => Promise<void>;
  createYard: (data: any) => Promise<any>;
  updateYard: (id: string, data: any) => Promise<any>;

  fetchDockAppts: () => Promise<void>;
  createDockAppt: (data: any) => Promise<any>;
  updateDockAppt: (id: string, data: any) => Promise<any>;
}

export const useWarehouseStore = create<WarehouseState>((set, get) => ({
  skus: [],
  shipmentsIn: [],
  shipmentsOut: [],
  locations: [],
  receives: [],
  pickLists: [],
  counts: [],
  crossDocks: [],
  returns: [],
  yards: [],
  dockAppts: [],
  loading: false,

  fetchSkus: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/skus");
      if (res.ok) {
        const data = await res.json();
        set({ skus: data.skus });
      }
    } finally {
      set({ loading: false });
    }
  },
  createSku: async (data: any) => {
    const res = await fetch("/api/warehouse/skus", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { sku } = await res.json();
      set((s) => ({ skus: [sku, ...s.skus] }));
      return sku;
    }
    throw new Error("Failed");
  },
  updateSku: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/skus/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { sku } = await res.json();
      set((s) => ({ skus: s.skus.map((item) => (item.id === id ? sku : item)) }));
      return sku;
    }
    throw new Error("Failed");
  },

  fetchInbounds: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/inbound");
      if (res.ok) {
        const data = await res.json();
        set({ shipmentsIn: data.shipments });
      }
    } finally {
      set({ loading: false });
    }
  },
  createInbound: async (data: any) => {
    const res = await fetch("/api/warehouse/inbound", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { shipment } = await res.json();
      set((s) => ({ shipmentsIn: [shipment, ...s.shipmentsIn] }));
      return shipment;
    }
    throw new Error("Failed");
  },
  updateInbound: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/inbound/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { shipment } = await res.json();
      set((s) => ({ shipmentsIn: s.shipmentsIn.map((item) => (item.id === id ? shipment : item)) }));
      return shipment;
    }
    throw new Error("Failed");
  },

  fetchOutbounds: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/outbound");
      if (res.ok) {
        const data = await res.json();
        set({ shipmentsOut: data.shipments });
      }
    } finally {
      set({ loading: false });
    }
  },
  createOutbound: async (data: any) => {
    const res = await fetch("/api/warehouse/outbound", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { shipment } = await res.json();
      set((s) => ({ shipmentsOut: [shipment, ...s.shipmentsOut] }));
      return shipment;
    }
    throw new Error("Failed");
  },
  updateOutbound: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/outbound/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { shipment } = await res.json();
      set((s) => ({ shipmentsOut: s.shipmentsOut.map((item) => (item.id === id ? shipment : item)) }));
      return shipment;
    }
    throw new Error("Failed");
  },

  fetchLocations: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/storage");
      if (res.ok) {
        const data = await res.json();
        set({ locations: data.locations });
      }
    } finally {
      set({ loading: false });
    }
  },
  createLocation: async (data: any) => {
    const res = await fetch("/api/warehouse/storage", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { location } = await res.json();
      set((s) => ({ locations: [location, ...s.locations] }));
      return location;
    }
    throw new Error("Failed");
  },
  updateLocation: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/storage/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { location } = await res.json();
      set((s) => ({ locations: s.locations.map((item) => (item.id === id ? location : item)) }));
      return location;
    }
    throw new Error("Failed");
  },

  fetchPodReceives: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/pod-receive");
      if (res.ok) {
        const data = await res.json();
        set({ receives: data.receives });
      }
    } finally {
      set({ loading: false });
    }
  },
  createPodReceive: async (data: any) => {
    const res = await fetch("/api/warehouse/pod-receive", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { receive } = await res.json();
      set((s) => ({ receives: [receive, ...s.receives] }));
      return receive;
    }
    throw new Error("Failed");
  },
  updatePodReceive: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/pod-receive/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { receive } = await res.json();
      set((s) => ({ receives: s.receives.map((item) => (item.id === id ? receive : item)) }));
      return receive;
    }
    throw new Error("Failed");
  },

  fetchPickLists: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/pick-pack");
      if (res.ok) {
        const data = await res.json();
        set({ pickLists: data.pickLists });
      }
    } finally {
      set({ loading: false });
    }
  },
  createPickList: async (data: any) => {
    const res = await fetch("/api/warehouse/pick-pack", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { pickList } = await res.json();
      set((s) => ({ pickLists: [pickList, ...s.pickLists] }));
      return pickList;
    }
    throw new Error("Failed");
  },
  updatePickList: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/pick-pack/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { pickList } = await res.json();
      set((s) => ({ pickLists: s.pickLists.map((item) => (item.id === id ? pickList : item)) }));
      return pickList;
    }
    throw new Error("Failed");
  },

  fetchCounts: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/cycle-count");
      if (res.ok) {
        const data = await res.json();
        set({ counts: data.counts });
      }
    } finally {
      set({ loading: false });
    }
  },
  createCount: async (data: any) => {
    const res = await fetch("/api/warehouse/cycle-count", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { count } = await res.json();
      set((s) => ({ counts: [count, ...s.counts] }));
      return count;
    }
    throw new Error("Failed");
  },
  updateCount: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/cycle-count/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { count } = await res.json();
      set((s) => ({ counts: s.counts.map((item) => (item.id === id ? count : item)) }));
      return count;
    }
    throw new Error("Failed");
  },

  fetchCrossDocks: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/cross-dock");
      if (res.ok) {
        const data = await res.json();
        set({ crossDocks: data.crossDocks });
      }
    } finally {
      set({ loading: false });
    }
  },
  createCrossDock: async (data: any) => {
    const res = await fetch("/api/warehouse/cross-dock", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { crossDock } = await res.json();
      set((s) => ({ crossDocks: [crossDock, ...s.crossDocks] }));
      return crossDock;
    }
    throw new Error("Failed");
  },
  updateCrossDock: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/cross-dock/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { crossDock } = await res.json();
      set((s) => ({ crossDocks: s.crossDocks.map((item) => (item.id === id ? crossDock : item)) }));
      return crossDock;
    }
    throw new Error("Failed");
  },

  fetchReturns: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/returns");
      if (res.ok) {
        const data = await res.json();
        set({ returns: data });
      }
    } finally {
      set({ loading: false });
    }
  },
  createReturn: async (data: any) => {
    const res = await fetch("/api/warehouse/returns", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const returnItem = await res.json();
      set((s) => ({ returns: [returnItem, ...s.returns] }));
      return returnItem;
    }
    throw new Error("Failed");
  },
  updateReturn: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/returns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const returnItem = await res.json();
      set((s) => ({ returns: s.returns.map((item) => (item.id === id ? returnItem : item)) }));
      return returnItem;
    }
    throw new Error("Failed");
  },

  fetchYards: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/yard");
      if (res.ok) {
        const data = await res.json();
        set({ yards: data });
      }
    } finally {
      set({ loading: false });
    }
  },
  createYard: async (data: any) => {
    const res = await fetch("/api/warehouse/yard", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const yard = await res.json();
      set((s) => ({ yards: [yard, ...s.yards] }));
      return yard;
    }
    throw new Error("Failed");
  },
  updateYard: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/yard/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const yard = await res.json();
      set((s) => ({ yards: s.yards.map((item) => (item.id === id ? yard : item)) }));
      return yard;
    }
    throw new Error("Failed");
  },

  fetchDockAppts: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/dock-appt");
      if (res.ok) {
        const data = await res.json();
        set({ dockAppts: data });
      }
    } finally {
      set({ loading: false });
    }
  },
  createDockAppt: async (data: any) => {
    const res = await fetch("/api/warehouse/dock-appt", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const appt = await res.json();
      set((s) => ({ dockAppts: [appt, ...s.dockAppts] }));
      return appt;
    }
    throw new Error("Failed");
  },
  updateDockAppt: async (id: string, data: any) => {
    const res = await fetch(`/api/warehouse/dock-appt/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const appt = await res.json();
      set((s) => ({ dockAppts: s.dockAppts.map((item) => (item.id === id ? appt : item)) }));
      return appt;
    }
    throw new Error("Failed");
  },

}));
