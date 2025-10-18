import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

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
      const map = L.map(mapRef.current).setView([40.4168, -3.7038], 6); // Madrid por defecto

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
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log(
        "Archivo seleccionado:",
        file.name,
        "Tamaño:",
        file.size,
        "bytes"
      );

      const worker = new Worker("parser.js", { type: "module" });

      worker.onmessage = (event) => {
        if (event.data.messageType === "GPS") {
          console.log(
            "[GPS]",
            event.data.messageList.Lat[0],
            event.data.messageList.Lng[0]
          );

          const coords = [
            parseFloat(event.data.messageList.Lat[0]) / 10 ** 7,
            parseFloat(event.data.messageList.Lng[0]) / 10 ** 7,
          ];

          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([coords[0], coords[1]], 15);
          }
        }

        if (event.data.hasOwnProperty("percentage")) {
          //console.log(`percentage: ${event.data.percentage}`);
        } else if (event.data.hasOwnProperty("availableMessages")) {
          //console.log("Available message types:");
          //console.log(event.data.availableMessages);
        } else if (event.data.hasOwnProperty("metadata")) {
          //console.log("got metadata:");
          //console.log(event.data.metadata);
        } else if (event.data.hasOwnProperty("messages")) {
          //console.log("got messages");
          //console.log(event.data.messages);
        } else if (event.data.hasOwnProperty("messageType")) {
          //console.log(`got list of ${event.data.messageType}:`);
          //console.log(event.data.messageList);
        } else if (
          event.data.hasOwnProperty("messageType") &&
          event.data.messageType === "GPS"
        ) {
          console.log(event.data.messageList);

          //
        } else if (event.data.hasOwnProperty("files")) {
          //console.log("got files:");
          //console.log(event.data.files);
        } else if (event.data.hasOwnProperty("messagesDoneLoading")) {
          console.log("messages finished loading");
        }
      };
      let reader = new FileReader();
      reader.onload = function (e) {
        let arrayBuffer = new Uint8Array(reader.result as ArrayBuffer);
        console.log(arrayBuffer);
        let data = reader.result;
        worker.postMessage({
          action: "parse",
          file: data,
        });
      };

      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="app">
      <div className="sidepanel">
        <input
          type="file"
          id="fileInput"
          accept=".bin"
          onChange={handleFileChange}
        />
      </div>
      <div className="main">
        <div className="map" ref={mapRef}></div>
      </div>
    </div>
  );
}

export default App;
