import { useEffect, useRef } from "react";
import maplibregl, {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import * as DeckMapbox from "@deck.gl/mapbox";
import { PathLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";

interface MarkerData {
  lat: number;
  lng: number;
  color?: string;
  name?: string;
}

interface MapProps {
  defaultCoords?: [number, number];
  markers?: MarkerData[];
  className?: string;
  selectedTrack?: { lat: number; lng: number; alt?: number }[];
}

const Map = ({
  defaultCoords = [40.4168, -3.7038],
  markers = [],
  className = "",
  selectedTrack,
}: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const deckOverlayRef = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      const init = async () => {
        const maptilerKey = import.meta.env.VITE_MAPTILER_KEY as
          | string
          | undefined;

        const osm2DStyle: any = {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: [
                "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap contributors",
            },
          },
          layers: [
            {
              id: "osm",
              type: "raster",
              source: "osm",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        };

        let style: any = osm2DStyle;
        if (maptilerKey) {
          try {
            const resp = await fetch(
              `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilerKey}`
            );
            const remoteStyle = await resp.json();
            // Remove any sky layers from style
            remoteStyle.layers = (remoteStyle.layers || []).filter(
              (l: any) => l.type !== "sky" && l.id !== "sky"
            );
            // Some styles may include a sky source; keep sources as-is
            style = remoteStyle;
          } catch (e) {
            // Fallback silently to OSM style on any error
            style = osm2DStyle;
          }
        }

        const map = new maplibregl.Map({
          container: mapRef.current as HTMLDivElement,
          style,
          center: [defaultCoords[1], defaultCoords[0]], // [lng, lat]
          zoom: 6,
        });

        if (maptilerKey) {
          map.on("load", () => {
            if (!map.getSource("terrain")) {
              map.addSource("terrain", {
                type: "raster-dem",
                url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${maptilerKey}`,
                tileSize: 256,
              } as any);
            }
            map.setTerrain({ source: "terrain", exaggeration: 1.2 } as any);
          });
        }

        mapInstanceRef.current = map;
      };
      void init();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Efecto para manejar los marcadores
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Limpiar marcadores existentes
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current = [];

    markers.forEach((markerData) => {
      const { lat, lng, color = "blue", name } = markerData;

      // Crear contenedor principal para el marcador y el nombre
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.position = "relative";

      // Crear el marcador circular
      const markerEl = document.createElement("div");
      markerEl.style.backgroundColor = color;
      markerEl.style.width = "20px";
      markerEl.style.height = "20px";
      markerEl.style.borderRadius = "50%";
      markerEl.style.border = "2px solid white";
      markerEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      markerEl.style.zIndex = "1";

      container.appendChild(markerEl);

      // Agregar nombre si existe
      if (name) {
        const nameEl = document.createElement("div");
        nameEl.textContent = name;
        nameEl.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
        nameEl.style.color = "#333";
        nameEl.style.padding = "4px 8px";
        nameEl.style.borderRadius = "4px";
        nameEl.style.fontSize = "12px";
        nameEl.style.fontWeight = "500";
        nameEl.style.whiteSpace = "nowrap";
        nameEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
        nameEl.style.marginTop = "4px";
        nameEl.style.border = "1px solid rgba(0,0,0,0.1)";
        nameEl.style.maxWidth = "150px";
        nameEl.style.overflow = "hidden";
        nameEl.style.textOverflow = "ellipsis";

        container.appendChild(nameEl);
      }

      const marker = new maplibregl.Marker({ element: container })
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    if (markers.length > 0) {
      const MAX_FIT_ZOOM = 15;
      if (markers.length === 1) {
        const { lat, lng } = markers[0];
        mapInstanceRef.current.easeTo({
          center: [lng, lat],
          zoom: MAX_FIT_ZOOM,
        });
      } else {
        const bounds = new maplibregl.LngLatBounds();
        markers.forEach(({ lat, lng }) => bounds.extend([lng, lat]));

        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const deltaLat = Math.abs(ne.lat - sw.lat);
        const deltaLng = Math.abs(ne.lng - sw.lng);

        // If markers are extremely close, avoid over-zooming: center and use capped zoom
        const areVeryClose = deltaLat < 0.01 && deltaLng < 0.01; // ~1km depending on latitude
        if (areVeryClose) {
          const avg = markers.reduce(
            (acc, m) => ({ lat: acc.lat + m.lat, lng: acc.lng + m.lng }),
            { lat: 0, lng: 0 }
          );
          const center = [
            avg.lng / markers.length,
            avg.lat / markers.length,
          ] as [number, number];
          mapInstanceRef.current.easeTo({ center, zoom: MAX_FIT_ZOOM });
        } else {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: 40,
            maxZoom: MAX_FIT_ZOOM,
          });
        }
      }
    }
  }, [markers]);

  // Efecto para dibujar la pista seleccionada
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Si no hay track, eliminar overlay Deck.gl si existe
    if (!selectedTrack || selectedTrack.length === 0) {
      if (deckOverlayRef.current) {
        try {
          deckOverlayRef.current.setProps({ layers: [] });
          map.removeControl(deckOverlayRef.current);
        } catch (_) {}
        deckOverlayRef.current = null;
      }
      return;
    }

    const addOrUpdate = () => {
      // Solo usar Deck.gl para renderizar el track 3D
      const hasAltitude = selectedTrack.some((p) => typeof p.alt === "number");
      const pathLayer = new PathLayer({
        id: "deckgl-selected-track-path",
        data: hasAltitude ? [selectedTrack] : [],
        getPath: (d: any) => d.map((p: any) => [p.lng, p.lat, p.alt || 0]),
        getWidth: 4,
        widthUnits: "pixels",
        getColor: [255, 85, 0, 255],
        parameters: { depthTest: true },
      } as any);

      const OverlayClass = (DeckMapbox as any).MapboxOverlay;
      if (hasAltitude) {
        if (!deckOverlayRef.current) {
          deckOverlayRef.current = new OverlayClass({ layers: [pathLayer] });
          map.addControl(deckOverlayRef.current);
        } else {
          deckOverlayRef.current.setProps({ layers: [pathLayer] });
        }
      } else if (deckOverlayRef.current) {
        try {
          deckOverlayRef.current.setProps({ layers: [] });
          map.removeControl(deckOverlayRef.current);
        } catch (_) {}
        deckOverlayRef.current = null;
      }

      // Ajustar vista a la pista con límite de zoom
      const bounds = new maplibregl.LngLatBounds();
      selectedTrack.forEach((point) =>
        bounds.extend([point.lng, point.lat] as [number, number])
      );
      map.fitBounds(bounds, { padding: 40 });
    };

    if (!map.isStyleLoaded()) {
      map.once("load", addOrUpdate);
    } else {
      addOrUpdate();
    }
  }, [selectedTrack]);

  return <div ref={mapRef} className={className} />;
};

export default Map;
