import { useState } from "react";
import Map from "./components/Map";
import MissionCard from "./components/MissionCard";
import "./App.css";

interface MarkerData {
  lat: number[];
  lng: number[];
  color?: string;
}

interface Mission {
  id: string;
  fileName: string;
  color: string;
  markers: MarkerData[];
}

function App() {
  const [, setSelectedFile] = useState<File | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    null
  );

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
        markers: [],
      };

      setMissions((prevMissions) => [...prevMissions, newMission]);

      setSelectedMissionId(missionId);

      const worker = new Worker("parser.js", { type: "module" });

      worker.onmessage = (event) => {
        if (event.data.messageType === "GPS") {
          setMissions((prevMissions) =>
            prevMissions.map((mission) => ({
              ...mission,
              markers: [
                ...mission.markers,
                {
                  lat: event.data.messageList.Lat,
                  lng: event.data.messageList.Lng,
                  color: mission.color,
                },
              ],
            }))
          );
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

  // Obtener todos los marcadores de todas las misiones
  const allMarkers = missions.flatMap((mission) =>
    mission.markers.map((marker) => ({
      lat: marker.lat[0] / 10 ** 7,
      lng: marker.lng[0] / 10 ** 7,
      color: marker.color ?? "blue",
    }))
  );

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
              markerCount={mission.markers.length}
              isSelected={selectedMissionId === mission.id}
              onSelect={() => setSelectedMissionId(mission.id)}
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
