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
  processing?: boolean;
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
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length === 0) {
      return;
    }

    setSelectedFile(files[0]);

    files.forEach((file) => {
      const missionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const missionColor = generateRandomColor();
      const newMission: Mission = {
        id: missionId,
        fileName: file.name,
        color: missionColor,
        trackPoints: { lat: [], lng: [] },
        processing: true,
      };

      // updating state here to show the loading icon in the cards
      setMissions((missions) => [newMission, ...missions]);

      let gpsData: any;
      const worker = new Worker("parser.js", { type: "module" });

      worker.onmessage = (event) => {
        if (
          event.data.messageType === "GPS[0]" ||
          event.data.messageType === "GPS"
        ) {
          gpsData = event.data.messageList;
        }

        if (event.data.hasOwnProperty("messagesDoneLoading")) {
          if (gpsData) {
            const firstLat = (gpsData as any).Lat[0] / 10 ** 7;
            const firstLng = (gpsData as any).Lng[0] / 10 ** 7;

            getLocationInfo(firstLat, firstLng).then((location) => {
              setMissions((prevMissions) => {
                const foundMission = prevMissions.find(
                  (mission) => mission.id === missionId
                );

                if (!foundMission) {
                  return prevMissions;
                }

                foundMission.trackPoints = {
                  lat: (gpsData as any).Lat,
                  lng: (gpsData as any).Lng,
                  color: newMission.color,
                };
                foundMission.location = location;
                foundMission.processing = false;

                return [...prevMissions];
              });
            });
          }
        }
      };

      const reader = new FileReader();
      reader.onload = function () {
        const data = reader.result;
        worker.postMessage({
          action: "parse",
          file: data,
        });
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const allMarkers = useMemo(
    () =>
      missions
        .filter((mission) => mission.processing === false)
        .map((mission) => ({
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
            multiple
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
              processing={mission.processing}
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
