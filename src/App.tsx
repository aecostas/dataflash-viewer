import { useMemo, useState } from "react";
import getLocationInfo from "./services/geolocation";
import Map from "./components/Map";
import MissionCard from "./components/MissionCard";
import "./App.css";

export interface TrackPointsList {
  lat: number[];
  lng: number[];
  color?: string;
}

export interface Mission {
  id: string;
  fileName: string;
  color: string;
  trackPoints: TrackPointsList;
  location?: string;
}

function App() {
  const [, setSelectedFile] = useState<File | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);

  const generateRandomColor = (): string => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
      "#F8C471",
      "#82E0AA",
      "#F1948A",
      "#85C1E9",
      "#D7BDE2",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

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

      const missionId = Date.now().toString();
      const missionColor = generateRandomColor();
      const newMission: Mission = {
        id: missionId,
        fileName: file.name,
        color: missionColor,
        trackPoints: { lat: [], lng: [] },
      };

      //setSelectedMissionId(missionId);
      let gpsData: any;
      const worker = new Worker("parser.js", { type: "module" });

      worker.onmessage = (event) => {
        console.log("event:", event.data);

        if (
          event.data.messageType === "GPS[0]" ||
          event.data.messageType === "GPS"
        ) {
          gpsData = event.data.messageList;
          console.log("gpsData:", gpsData);
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
        } else if (event.data.hasOwnProperty("files")) {
          //console.log("got files:");
          //console.log(event.data.files);
        } else if (event.data.hasOwnProperty("messagesDoneLoading")) {
          console.log("[aec] messages finished loading: ", gpsData);

          if (gpsData) {
            // Obtener las coordenadas del primer punto para la ubicación
            const firstLat = (gpsData as any).Lat[0] / 10 ** 7;
            const firstLng = (gpsData as any).Lng[0] / 10 ** 7;

            // Obtener información de ubicación
            getLocationInfo(firstLat, firstLng).then((location) => {
              setMissions((prevMissions) => [
                ...prevMissions,
                {
                  ...newMission,
                  trackPoints: {
                    lat: (gpsData as any).Lat,
                    lng: (gpsData as any).Lng,
                    color: newMission.color,
                  },
                  location: location,
                },
              ]);
            });
          }
        }
      };
      let reader = new FileReader();
      reader.onload = function () {
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

  const allMarkers = useMemo(
    () =>
      missions.map((mission) => ({
        lat: mission.trackPoints.lat[0] / 10 ** 7 || 0,
        lng: mission.trackPoints.lng[0] / 10 ** 7 || 0,
        color: mission.color,
      })),
    [missions]
  );

  console.log("[aec]allMarkers:", missions);

  return (
    <div className="app">
      <div className="sidepanel">
        <div className="file-input-section">
          <label htmlFor="fileInput" className="file-input-label">
            Seleccionar archivo .bin
          </label>
          <input
            type="file"
            id="fileInput"
            accept=".bin"
            onChange={handleFileChange}
            className="file-input"
          />
        </div>

        <div className="missions-section">
          <h3>Misiones</h3>
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              fileName={mission.fileName}
              color={mission.color}
              trackPoints={mission.trackPoints}
              location={mission.location}
              isSelected={false}
              onSelect={() => {}}
            />
          ))}
        </div>
      </div>
      <div className="main">
        <Map markers={allMarkers} className="map" />
      </div>
    </div>
  );
}

export default App;
