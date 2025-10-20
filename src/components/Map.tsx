import { useEffect, useRef } from "react";
import maplibregl, {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface MarkerData {
  lat: number;
  lng: number;
  color?: string;
}

interface MapProps {
  defaultCoords?: [number, number];
  markers?: MarkerData[];
  className?: string;
}

const Map = ({
  defaultCoords = [40.4168, -3.7038],
  markers = [],
  className = "",
}: MapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      console.log("mapRef.current", mapRef.current);
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

      const style: any = maptilerKey
        ? `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilerKey}`
        : osm2DStyle;

      const map = new maplibregl.Map({
        container: mapRef.current,
        style,
        center: [defaultCoords[1], defaultCoords[0]], // [lng, lat]
        zoom: 6,
        maxZoom: 14,
      });

      if (maptilerKey) {
        map.on("load", () => {
          // Add MapTiler Terrain DEM source
          if (!map.getSource("terrain")) {
            map.addSource("terrain", {
              type: "raster-dem",
              url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${maptilerKey}`,
              tileSize: 256,
            } as any);
          }

          // Enable terrain with a slight exaggeration
          map.setTerrain({ source: "terrain", exaggeration: 1.2 } as any);

          // Add a sky layer for better 3D visualization
          if (!map.getLayer("sky")) {
            map.addLayer({
              id: "sky",
              type: "sky",
              paint: {
                "sky-type": "atmosphere",
                "sky-atmosphere-sun": [0.0, 0.0],
                "sky-atmosphere-sun-intensity": 15,
              },
            } as any);
          }
        });
      }
      mapInstanceRef.current = map;
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
      const { lat, lng, color = "blue" } = markerData;

      const el = document.createElement("div");
      el.style.backgroundColor = color;
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(mapInstanceRef.current!);
      markersRef.current.push(marker);
    });

    if (markers.length > 0) {
      const MAX_FIT_ZOOM = 11;
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

  return <div ref={mapRef} className={className} />;
};

export default Map;
