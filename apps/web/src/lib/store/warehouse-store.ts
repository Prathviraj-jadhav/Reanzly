import { create } from "zustand";
import {
  fetchWarehouseSkus,
  createWarehouseSku,
  patchWarehouseSku,
  fetchWarehouseInbounds,
  createWarehouseInbound,
  patchWarehouseInbound,
  fetchWarehouseOutbounds,
  createWarehouseOutbound,
  patchWarehouseOutbound,
  fetchWarehouseLocations,
  createWarehouseLocation,
  patchWarehouseLocation,
  fetchWarehousePodReceives,
  createWarehousePodReceive,
  patchWarehousePodReceive,
  fetchWarehousePickLists,
  createWarehousePickList,
  patchWarehousePickList,
  fetchWarehouseCycleCounts,
  createWarehouseCycleCount,
  patchWarehouseCycleCount,
  fetchWarehouseCrossDocks,
  createWarehouseCrossDock,
  patchWarehouseCrossDock,
  fetchWarehouseReturns,
  createWarehouseReturn,
  patchWarehouseReturn,
  fetchWarehouseYards,
  createWarehouseYard,
  patchWarehouseYard,
  fetchWarehouseDockAppts,
  createWarehouseDockAppt,
  patchWarehouseDockAppt,
} from "@/lib/warehouse-api";

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

export const useWarehouseStore = create<WarehouseState>((set) => ({
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
      const skus = await fetchWarehouseSkus();
      set({ skus });
    } finally {
      set({ loading: false });
    }
  },
  createSku: async (data: any) => {
    const sku = await createWarehouseSku(data);
    set((s) => ({ skus: [sku, ...s.skus] }));
    return sku;
  },
  updateSku: async (id: string, data: any) => {
    const sku = await patchWarehouseSku(id, data);
    set((s) => ({ skus: s.skus.map((item) => (item.id === id ? sku : item)) }));
    return sku;
  },

  fetchInbounds: async () => {
    set({ loading: true });
    try {
      const shipmentsIn = await fetchWarehouseInbounds();
      set({ shipmentsIn });
    } finally {
      set({ loading: false });
    }
  },
  createInbound: async (data: any) => {
    const shipment = await createWarehouseInbound(data);
    set((s) => ({ shipmentsIn: [shipment, ...s.shipmentsIn] }));
    return shipment;
  },
  updateInbound: async (id: string, data: any) => {
    const shipment = await patchWarehouseInbound(id, data);
    set((s) => ({ shipmentsIn: s.shipmentsIn.map((item) => (item.id === id ? shipment : item)) }));
    return shipment;
  },

  fetchOutbounds: async () => {
    set({ loading: true });
    try {
      const shipmentsOut = await fetchWarehouseOutbounds();
      set({ shipmentsOut });
    } finally {
      set({ loading: false });
    }
  },
  createOutbound: async (data: any) => {
    const shipment = await createWarehouseOutbound(data);
    set((s) => ({ shipmentsOut: [shipment, ...s.shipmentsOut] }));
    return shipment;
  },
  updateOutbound: async (id: string, data: any) => {
    const shipment = await patchWarehouseOutbound(id, data);
    set((s) => ({ shipmentsOut: s.shipmentsOut.map((item) => (item.id === id ? shipment : item)) }));
    return shipment;
  },

  fetchLocations: async () => {
    set({ loading: true });
    try {
      const locations = await fetchWarehouseLocations();
      set({ locations });
    } finally {
      set({ loading: false });
    }
  },
  createLocation: async (data: any) => {
    const location = await createWarehouseLocation(data);
    set((s) => ({ locations: [location, ...s.locations] }));
    return location;
  },
  updateLocation: async (id: string, data: any) => {
    const location = await patchWarehouseLocation(id, data);
    set((s) => ({ locations: s.locations.map((item) => (item.id === id ? location : item)) }));
    return location;
  },

  fetchPodReceives: async () => {
    set({ loading: true });
    try {
      const receives = await fetchWarehousePodReceives();
      set({ receives });
    } finally {
      set({ loading: false });
    }
  },
  createPodReceive: async (data: any) => {
    const receive = await createWarehousePodReceive(data);
    set((s) => ({ receives: [receive, ...s.receives] }));
    return receive;
  },
  updatePodReceive: async (id: string, data: any) => {
    const receive = await patchWarehousePodReceive(id, data);
    set((s) => ({ receives: s.receives.map((item) => (item.id === id ? receive : item)) }));
    return receive;
  },

  fetchPickLists: async () => {
    set({ loading: true });
    try {
      const pickLists = await fetchWarehousePickLists();
      set({ pickLists });
    } finally {
      set({ loading: false });
    }
  },
  createPickList: async (data: any) => {
    const pickList = await createWarehousePickList(data);
    set((s) => ({ pickLists: [pickList, ...s.pickLists] }));
    return pickList;
  },
  updatePickList: async (id: string, data: any) => {
    const pickList = await patchWarehousePickList(id, data);
    set((s) => ({ pickLists: s.pickLists.map((item) => (item.id === id ? pickList : item)) }));
    return pickList;
  },

  fetchCounts: async () => {
    set({ loading: true });
    try {
      const counts = await fetchWarehouseCycleCounts();
      set({ counts });
    } finally {
      set({ loading: false });
    }
  },
  createCount: async (data: any) => {
    const count = await createWarehouseCycleCount(data);
    set((s) => ({ counts: [count, ...s.counts] }));
    return count;
  },
  updateCount: async (id: string, data: any) => {
    const count = await patchWarehouseCycleCount(id, data);
    set((s) => ({ counts: s.counts.map((item) => (item.id === id ? count : item)) }));
    return count;
  },

  fetchCrossDocks: async () => {
    set({ loading: true });
    try {
      const crossDocks = await fetchWarehouseCrossDocks();
      set({ crossDocks });
    } finally {
      set({ loading: false });
    }
  },
  createCrossDock: async (data: any) => {
    const crossDock = await createWarehouseCrossDock(data);
    set((s) => ({ crossDocks: [crossDock, ...s.crossDocks] }));
    return crossDock;
  },
  updateCrossDock: async (id: string, data: any) => {
    const crossDock = await patchWarehouseCrossDock(id, data);
    set((s) => ({ crossDocks: s.crossDocks.map((item) => (item.id === id ? crossDock : item)) }));
    return crossDock;
  },

  fetchReturns: async () => {
    set({ loading: true });
    try {
      const returns = await fetchWarehouseReturns();
      set({ returns });
    } finally {
      set({ loading: false });
    }
  },
  createReturn: async (data: any) => {
    const returnItem = await createWarehouseReturn(data);
    set((s) => ({ returns: [returnItem, ...s.returns] }));
    return returnItem;
  },
  updateReturn: async (id: string, data: any) => {
    const returnItem = await patchWarehouseReturn(id, data);
    set((s) => ({ returns: s.returns.map((item) => (item.id === id ? returnItem : item)) }));
    return returnItem;
  },

  fetchYards: async () => {
    set({ loading: true });
    try {
      const yards = await fetchWarehouseYards();
      set({ yards });
    } finally {
      set({ loading: false });
    }
  },
  createYard: async (data: any) => {
    const yard = await createWarehouseYard(data);
    set((s) => ({ yards: [yard, ...s.yards] }));
    return yard;
  },
  updateYard: async (id: string, data: any) => {
    const yard = await patchWarehouseYard(id, data);
    set((s) => ({ yards: s.yards.map((item) => (item.id === id ? yard : item)) }));
    return yard;
  },

  fetchDockAppts: async () => {
    set({ loading: true });
    try {
      const dockAppts = await fetchWarehouseDockAppts();
      set({ dockAppts });
    } finally {
      set({ loading: false });
    }
  },
  createDockAppt: async (data: any) => {
    const appt = await createWarehouseDockAppt(data);
    set((s) => ({ dockAppts: [appt, ...s.dockAppts] }));
    return appt;
  },
  updateDockAppt: async (id: string, data: any) => {
    const appt = await patchWarehouseDockAppt(id, data);
    set((s) => ({ dockAppts: s.dockAppts.map((item) => (item.id === id ? appt : item)) }));
    return appt;
  },
}));
