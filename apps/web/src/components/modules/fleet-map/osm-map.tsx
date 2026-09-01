"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  Polygon,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import { Maximize2, Crosshair } from "lucide-react";
import { toast } from "sonner";
import type { Vehicle, Trip, VehicleStatus } from "@/lib/types";
import {
  CITY_LATLNG,
  VEHICLE_MARKER_STYLES,
  cityToLatLng,
  vehicleLatLng,
  type Geofence,
} from "./_helpers";

export interface PlaybackPoint {
  lat: number;
  lng: number;
  t: number;
  city: string;
}

interface OsmMapProps {
  vehicles: Vehicle[];
  trips: Trip[];
  geofences: Geofence[];
  showRoutes: boolean;
  showPlannedRoutes: boolean;
  showGeofences: boolean;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  onHoverVehicle?: (id: string | null) => void;
  // Playback
  playbackActive: boolean;
  playbackVehicleId: string | null;
  playbackProgress: number; // 0..1
  playbackPath?: PlaybackPoint[];
}

const INDIA_CENTER: [number, number] = [22.5, 80];
const INDIA_ZOOM = 5;

const MAJOR_CITIES = [
  "Mumbai", "Pune", "Delhi", "Bengaluru", "Chennai", "Kolkata",
  "Ahmedabad", "Surat", "Nagpur", "Jaipur", "Hyderabad", "Indore",
  "Lucknow", "Patna", "Visakhapatnam", "Kochi",
];

// ===== divIcon builders =====

function vehicleIcon(
  status: VehicleStatus,
  isSelected: boolean,
  licensePlate: string,
  showLabel: boolean
): L.DivIcon {
  const style = VEHICLE_MARKER_STYLES[status];
  const size = style.radius * 2;
  const wrapClass = [
    "rvm-wrap",
    style.pulse ? "rvm-active" : "",
    isSelected ? "rvm-selected" : "",
  ].filter(Boolean).join(" ");
  const pulseHtml = style.pulse
    ? `<span class="rvm-pulse" style="width:${size}px;height:${size}px;"></span>`
    : "";
  const dotHtml = `<span class="rvm-dot" style="width:${size}px;height:${size}px;background:${style.fill};border:${style.strokeWidth}px solid ${style.stroke};"></span>`;
  const labelHtml = showLabel
    ? `<span class="rvm-label">${escapeHtml(licensePlate)}</span>`
    : "";
  const html = `<div class="${wrapClass}">${pulseHtml}${dotHtml}${labelHtml}</div>`;
  const box = size + 16;
  return L.divIcon({
    className: "reanzly-vehicle-marker",
    html,
    iconSize: [box, box],
    iconAnchor: [box / 2, box / 2],
  });
}

function cityLabelIcon(name: string): L.DivIcon {
  return L.divIcon({
    className: "reanzly-city-label",
    html: `<span class="rcl-text">${escapeHtml(name)}</span>`,
    iconSize: [0, 0],
    iconAnchor: [4, -2],
  });
}

function playbackIcon(): L.DivIcon {
  return L.divIcon({
    className: "reanzly-playback-marker",
    html: `<div class="rpm-wrap"><span class="rpm-pulse"></span><span class="rpm-dot"></span><span class="rpm-arrow">▲</span><span class="rpm-label">▶ REPLAY</span></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ===== Map controller - exposes the map instance to the parent =====

function MapController({
  onReady,
  selectedVehicleId,
  vehicles,
}: {
  onReady: (map: L.Map) => void;
  selectedVehicleId: string | null;
  vehicles: Vehicle[];
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  // Pan to the selected vehicle when selection changes.
  useEffect(() => {
    if (!selectedVehicleId) return;
    const v = vehicles.find((x) => x.id === selectedVehicleId);
    if (!v) return;
    const ll = vehicleLatLng(v);
    map.panTo(ll, { animate: true });
  }, [selectedVehicleId, vehicles, map]);

  return null;
}

// ===== Main component =====

export default function OsmMap({
  vehicles,
  trips,
  geofences,
  showRoutes,
  showPlannedRoutes,
  showGeofences,
  selectedVehicleId,
  onSelectVehicle,
  onHoverVehicle,
  playbackActive,
  playbackVehicleId,
  playbackProgress,
  playbackPath,
}: OsmMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [now, setNow] = useState(() => new Date());

  // Live clock ticker for the bottom-left status strip
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Active route lines - origin → current vehicle (solid), current → destination (dashed)
  const activeRouteLines = useMemo(() => {
    const lines: {
      id: string;
      points: [number, number][];
      dashed: boolean;
      vehicleName: string;
      tripId: string;
    }[] = [];
    for (const v of vehicles) {
      if (!v.assignedTripId) continue;
      const trip = trips.find((t) => t.id === v.assignedTripId);
      if (!trip) continue;
      if (trip.status !== "Active" && trip.status !== "In Transit") continue;
      const originLL = cityToLatLng(trip.origin);
      const destLL = cityToLatLng(trip.destination);
      const curLL = vehicleLatLng(v);
      lines.push({
        id: `actual-${v.id}`,
        points: [originLL, curLL],
        dashed: false,
        vehicleName: v.name,
        tripId: trip.tripId,
      });
      if (showPlannedRoutes) {
        lines.push({
          id: `planned-${v.id}`,
          points: [curLL, destLL],
          dashed: true,
          vehicleName: v.name,
          tripId: trip.tripId,
        });
      }
    }
    return lines;
  }, [vehicles, trips, showPlannedRoutes]);

  // Playback point at current progress
  const playbackPoint = useMemo<PlaybackPoint | null>(() => {
    if (!playbackActive || !playbackPath || playbackPath.length === 0) return null;
    const idx = Math.min(
      playbackPath.length - 1,
      Math.max(0, Math.round(playbackProgress * (playbackPath.length - 1)))
    );
    return playbackPath[idx];
  }, [playbackActive, playbackPath, playbackProgress]);

  const traveledPoints = useMemo<[number, number][]>(() => {
    if (!playbackActive || !playbackPath) return [];
    return playbackPath
      .filter((p) => p.t <= playbackProgress)
      .map((p) => [p.lat, p.lng] as [number, number]);
  }, [playbackActive, playbackPath, playbackProgress]);

  const upcomingPoints = useMemo<[number, number][]>(() => {
    if (!playbackActive || !playbackPath) return [];
    return playbackPath
      .filter((p) => p.t >= playbackProgress)
      .map((p) => [p.lat, p.lng] as [number, number]);
  }, [playbackActive, playbackPath, playbackProgress]);

  const handleReady = useCallback((m: L.Map) => {
    setMap(m);
  }, []);

  function handleLocateMe() {
    if (!map) return;
    map.locate({ setView: true, maxZoom: 13, enableHighAccuracy: true });
    const onFound = () => {
      toast.success("Located", {
        description: "Centered on your device location.",
      });
      map.off("locationfound", onFound);
      map.off("locationerror", onError);
    };
    const onError = (e: L.ErrorEvent) => {
      toast.error("Location unavailable", {
        description: e.message || "Permission denied or service unavailable.",
      });
      map.off("locationfound", onFound);
      map.off("locationerror", onError);
    };
    map.on("locationfound", onFound);
    map.on("locationerror", onError);
  }

  function handleFitFleet() {
    if (!map || vehicles.length === 0) {
      toast.error("No vehicles to fit", {
        description: "Adjust filters to include at least one vehicle.",
      });
      return;
    }
    const bounds = L.latLngBounds(vehicles.map((v) => vehicleLatLng(v)));
    map.fitBounds(bounds, { padding: [40, 40] });
    toast.info("Fit to fleet", {
      description: `Centered on ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}.`,
    });
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[6px] border border-border bg-background osm-mono">
      <MapContainer
        center={INDIA_CENTER}
        zoom={INDIA_ZOOM}
        minZoom={4}
        maxZoom={18}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          maxZoom={19}
        />
        <ZoomControl position="bottomright" />

        <MapController
          onReady={handleReady}
          selectedVehicleId={selectedVehicleId}
          vehicles={vehicles}
        />

        {/* Geofences */}
        {showGeofences &&
          geofences.map((gf) => {
            const className = `reanzly-geofence reanzly-geofence-${gf.status.toLowerCase().replace(/\s+/g, "-")}`;
            if (gf.type === "circle" && gf.centerLatLng && gf.radiusMeters) {
              return (
                <Circle
                  key={gf.id}
                  center={gf.centerLatLng}
                  radius={gf.radiusMeters}
                  pathOptions={{
                    className,
                    weight: 1,
                    color: "var(--foreground)",
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -4]}
                    opacity={1}
                    permanent={false}
                  >
                    <span className="font-mono uppercase tracking-wider">
                      {gf.name}
                    </span>
                  </Tooltip>
                </Circle>
              );
            }
            if (gf.type === "polygon" && gf.pointsLatLng && gf.pointsLatLng.length > 1) {
              return (
                <Polygon
                  key={gf.id}
                  positions={gf.pointsLatLng}
                  pathOptions={{
                    className,
                    weight: 1,
                    color: "var(--foreground)",
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -4]}
                    opacity={1}
                    permanent={false}
                  >
                    <span className="font-mono uppercase tracking-wider">
                      {gf.name}
                    </span>
                  </Tooltip>
                </Polygon>
              );
            }
            return null;
          })}

        {/* Active route lines */}
        {showRoutes &&
          activeRouteLines.map((ln) => (
            <Polyline
              key={ln.id}
              positions={ln.points}
              pathOptions={{
                className: ln.dashed
                  ? "reanzly-route reanzly-route-planned"
                  : "reanzly-route reanzly-route-actual",
                weight: ln.dashed ? 1.5 : 2,
                color: "var(--foreground)",
                opacity: ln.dashed ? 0.5 : 0.9,
              }}
            />
          ))}

        {/* City labels (major cities) */}
        {MAJOR_CITIES.filter((c) => CITY_LATLNG[c]).map((c) => (
          <Marker
            key={`city-${c}`}
            position={CITY_LATLNG[c]}
            icon={cityLabelIcon(c)}
            interactive={false}
            zIndexOffset={-100}
          />
        ))}

        {/* Vehicle markers */}
        {vehicles.map((v) => {
          const isPlaybackVehicle = playbackActive && playbackVehicleId === v.id;
          if (isPlaybackVehicle && playbackPoint) return null;
          const pos = vehicleLatLng(v);
          const isSelected = selectedVehicleId === v.id;
          const showLabel = isSelected || v.status === "Active";
          return (
            <Marker
              key={v.id}
              position={pos}
              icon={vehicleIcon(v.status, isSelected, v.licensePlate, showLabel)}
              zIndexOffset={isSelected ? 1000 : v.status === "Active" ? 500 : 0}
              eventHandlers={{
                click: () => onSelectVehicle(v.id),
                mouseover: () => onHoverVehicle?.(v.id),
                mouseout: () => onHoverVehicle?.(null),
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -8]}
                opacity={1}
                className="reanzly-tooltip"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-foreground">
                    {v.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {v.licensePlate}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {v.status} · {v.location ?? "-"}
                  </span>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Playback path overlay */}
        {playbackActive && playbackPath && playbackPath.length > 1 && (
          <>
            <Polyline
              positions={upcomingPoints}
              pathOptions={{
                className: "reanzly-route reanzly-playback-upcoming",
                weight: 1.5,
                color: "var(--foreground)",
                opacity: 0.4,
                dashArray: "4 4",
              }}
            />
            <Polyline
              positions={traveledPoints}
              pathOptions={{
                className: "reanzly-route reanzly-playback-traveled",
                weight: 2.2,
                color: "var(--foreground)",
                opacity: 1,
              }}
            />
          </>
        )}

        {/* Playback moving marker */}
        {playbackActive && playbackPoint && (
          <Marker
            position={[playbackPoint.lat, playbackPoint.lng]}
            icon={playbackIcon()}
            zIndexOffset={2000}
            interactive={false}
          />
        )}
      </MapContainer>

      {/* Overlay buttons - top-right (Locate me + Fit fleet). Hidden when the
          vehicle summary panel is open to avoid overlap. */}
      {!selectedVehicleId && (
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-[6px] border border-border bg-card/95 p-1 backdrop-blur-sm">
          <OverlayBtn label="Locate me" onClick={handleLocateMe}>
            <Crosshair className="h-3.5 w-3.5" />
          </OverlayBtn>
          <OverlayBtn label="Fit to fleet" onClick={handleFitFleet}>
            <Maximize2 className="h-3.5 w-3.5" />
          </OverlayBtn>
        </div>
      )}

      {/* No vehicles overlay */}
      {vehicles.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="rounded-[6px] border border-border bg-background px-4 py-3 text-center">
            <p className="text-[13px] font-medium text-foreground">
              No vehicles match filters
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Adjust filters above to see vehicles on the map.
            </p>
          </div>
        </div>
      )}

      {/* Bottom-left status ticker */}
      <div className="pointer-events-none absolute bottom-2 left-3 z-10 flex items-center gap-2 rounded-[4px] bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
        <span className="font-mono uppercase tracking-wider">GARAGE PLUS · FLEET MAP</span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground" />
        <span className="tabular">
          {now.toLocaleString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })}
        </span>
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-foreground" />
        <span className="font-mono">LIVE</span>
      </div>

      {/* Bottom-right tile attribution leaf is rendered by Leaflet itself; we
          position our zoom control above it via CSS. */}
    </div>
  );
}

function OverlayBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-[4px] text-foreground transition-colors hover:bg-accent"
    >
      {children}
    </button>
  );
}
