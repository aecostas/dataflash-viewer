import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Fix para los iconos de Leaflet
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      // Inicializar el mapa
      const map = L.map(mapRef.current).setView(defaultCoords, 6);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [defaultCoords]);

  // Efecto para manejar los marcadores
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Limpiar marcadores existentes
    markersRef.current.forEach((marker) => {
      mapInstanceRef.current?.removeLayer(marker);
    });

    markersRef.current = [];

    markers.forEach((markerData) => {
      const { lat, lng, color = "blue" } = markerData;

      // Crear icono personalizado con color
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(
        mapInstanceRef.current!
      );
      markersRef.current.push(marker);
    });

    if (markers.length > 0) {
      const group = L.featureGroup();
      markers.forEach((markerData) => {
        const { lat, lng } = markerData;
        const marker = L.marker([lat, lng]);
        group.addLayer(marker);
      });
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1)); // 10% de padding
    }
  }, [markers]);

  return <div ref={mapRef} className={className} />;
};

export default Map;
