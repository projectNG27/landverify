"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";

type Point = { lat: number; lng: number };
type SupportedState = "" | "Lagos" | "Ogun" | "Oyo" | "Osun";

const STATE_CENTERS: Record<SupportedState, Point> = {
  "": { lat: 6.5244, lng: 3.3792 }, // Lagos fallback
  Lagos: { lat: 6.5244, lng: 3.3792 },
  Ogun: { lat: 7.1604, lng: 3.3483 },
  Oyo: { lat: 7.3775, lng: 3.9470 },
  Osun: { lat: 7.5629, lng: 4.5200 },
};

type Props = {
  state: SupportedState;
  point: Point | null;
  onPick: (point: Point, displayAddress?: string) => void;
};

export function LocationMapPicker({ state, point, onPick }: Props) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const previousStateRef = useRef<SupportedState>("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const initial = point ?? STATE_CENTERS[state];
    const map = L.map(mapElementRef.current, {
      center: [initial.lat, initial.lng],
      zoom: 11,
      scrollWheelZoom: false,
      zoomAnimation: false,
      fadeAnimation: false,
      markerZoomAnimation: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      let displayAddress: string | undefined;
      try {
        const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
        const reverseRes = await fetch(reverseUrl, { headers: { Accept: "application/json" } });
        if (reverseRes.ok) {
          const reverseData = (await reverseRes.json()) as { display_name?: string };
          displayAddress = reverseData.display_name;
        }
      } catch {
        // Keep click-to-pick working even if reverse lookup fails.
      }
      onPick({ lat, lng }, displayAddress);
    });

    mapRef.current = map;
    return () => {
      map.stop();
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [onPick, point, state]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const previousState = previousStateRef.current;
    if (state && previousState !== state) {
      const center = STATE_CENTERS[state];
      map.setView([center.lat, center.lng], 11, { animate: false });
    }
    previousStateRef.current = state;
  }, [state]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.removeFrom(map);
      markerRef.current = null;
    }

    if (point) {
      markerRef.current = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color: "#0f4d3c",
        fillOpacity: 0.5,
      }).addTo(map);
    }
  }, [point]);

  function normalizeSearchText(value: string): string {
    return value
      .replace(/\bSt\b/gi, "Street")
      .replace(/\bRd\b/gi, "Road")
      .replace(/\bAve\b/gi, "Avenue")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function removePostcode(value: string): string {
    return value.replace(/\b\d{5,6}\b/g, "").replace(/\s{2,}/g, " ").trim();
  }

  async function lookupNominatim(term: string): Promise<{ point: Point; displayAddress?: string } | null> {
    const encoded = encodeURIComponent(term);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&countrycodes=ng&q=${encoded}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const first = data[0];
    if (!first) return null;
    const lat = Number.parseFloat(first.lat);
    const lng = Number.parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { point: { lat, lng }, displayAddress: first.display_name };
  }

  async function lookupGeocodeMaps(term: string): Promise<{ point: Point; displayAddress?: string } | null> {
    const encoded = encodeURIComponent(term);
    const url = `https://geocode.maps.co/search?q=${encoded}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    const first = data[0];
    if (!first) return null;
    const lat = Number.parseFloat(first.lat);
    const lng = Number.parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { point: { lat, lng }, displayAddress: first.display_name };
  }

  async function handleSearch() {
    const q = query.trim();
    if (!q) {
      setSearchMessage("Enter a location to search.");
      return;
    }
    setSearching(true);
    setSearchMessage(null);
    try {
      const stateName = state || "Lagos";
      const normalized = normalizeSearchText(q);
      const noPostcode = removePostcode(normalized);
      const candidates = Array.from(
        new Set([
          normalized,
          `${normalized}, ${stateName}`,
          `${normalized}, ${stateName}, Nigeria`,
          `${normalized}, Nigeria`,
          noPostcode,
          `${noPostcode}, ${stateName}`,
          `${noPostcode}, Nigeria`,
        ]),
      ).filter(Boolean);
      let found: { point: Point; displayAddress?: string } | null = null;
      for (const term of candidates) {
        found = (await lookupNominatim(term)) ?? (await lookupGeocodeMaps(term));
        if (found) break;
      }
      if (!found) {
        setSearchMessage("No match found. Try street + area (e.g. 'Lasisi Street, Fadeyi Lagos') or click map.");
        return;
      }
      onPick(found.point, found.displayAddress);
      mapRef.current?.setView([found.point.lat, found.point.lng], 14, { animate: false });
      setSearchMessage("Location found. You can fine-tune by clicking the exact point on the map.");
    } catch {
      setSearchMessage("Search is unavailable right now. Please click the map.");
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setSearchMessage("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setSearchMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        onPick(point);
        mapRef.current?.setView([point.lat, point.lng], 15, { animate: false });
        setSearchMessage("Using your current location. You can still click to adjust.");
        setLocating(false);
      },
      () => {
        setSearchMessage("Could not access your current location. Please allow location permission.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSearch();
            }
          }}
          placeholder={`Search location in ${state || "Lagos"}...`}
          className="w-full rounded-md border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm text-[var(--lv-ink)] outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--lv-border)] px-3 text-xs font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)] disabled:opacity-60"
        >
          {searching ? "Searching..." : "Search map"}
        </button>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--lv-border)] px-3 text-xs font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)] disabled:opacity-60"
        >
          {locating ? "Locating..." : "Use my current location (optional)"}
        </button>
      </div>
      {searchMessage ? <p className="text-xs text-[var(--lv-ink-muted)]">{searchMessage}</p> : null}

      <div className="overflow-hidden rounded-lg border border-[var(--lv-border)]">
      <div ref={mapElementRef} className="h-72 w-full" />
      </div>
    </div>
  );
}

