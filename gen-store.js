const fs = require('fs');

const endpoints = [
  { stateKey: 'skus', prefix: 'Sku', path: 'skus', resKey: 'skus', sresKey: 'sku' },
  { stateKey: 'shipmentsIn', prefix: 'Inbound', path: 'inbound', resKey: 'shipments', sresKey: 'shipment' },
  { stateKey: 'shipmentsOut', prefix: 'Outbound', path: 'outbound', resKey: 'shipments', sresKey: 'shipment' },
  { stateKey: 'locations', prefix: 'Location', path: 'storage', resKey: 'locations', sresKey: 'location' },
  { stateKey: 'receives', prefix: 'PodReceive', path: 'pod-receive', resKey: 'receives', sresKey: 'receive' },
  { stateKey: 'pickLists', prefix: 'PickList', path: 'pick-pack', resKey: 'pickLists', sresKey: 'pickList' },
  { stateKey: 'counts', prefix: 'Count', path: 'cycle-count', resKey: 'counts', sresKey: 'count' },
  { stateKey: 'crossDocks', prefix: 'CrossDock', path: 'cross-dock', resKey: 'crossDocks', sresKey: 'crossDock' }
];

let interfaceMethods = '';
let storeMethods = '';

endpoints.forEach(ep => {
  interfaceMethods += \
  fetch\s: () => Promise<void>;
  create\: (data: any) => Promise<any>;
  update\: (id: string, data: any) => Promise<any>;
\;

  storeMethods += \
  fetch\s: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/warehouse/\");
      if (res.ok) {
        const data = await res.json();
        set({ \: data.\ });
      }
    } finally {
      set({ loading: false });
    }
  },
  create\: async (data: any) => {
    const res = await fetch("/api/warehouse/\", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { \ } = await res.json();
      set((s) => ({ \: [\, ...s.\] }));
      return \;
    }
    throw new Error("Failed");
  },
  update\: async (id: string, data: any) => {
    const res = await fetch(\/api/warehouse/\/\\, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { \ } = await res.json();
      set((s) => ({ \: s.\.map((item) => (item.id === id ? \ : item)) }));
      return \;
    }
    throw new Error("Failed");
  },\;
});

const fileContent = \import { create } from "zustand";

interface WarehouseState {
  skus: any[];
  shipmentsIn: any[];
  shipmentsOut: any[];
  locations: any[];
  receives: any[];
  pickLists: any[];
  counts: any[];
  crossDocks: any[];
  loading: boolean;
  
\
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
  loading: false,

\
}));
\;

fs.writeFileSync('d:/Reanzo/reanzly/src/lib/store/warehouse-store.ts', fileContent);
console.log("Updated warehouse store");
