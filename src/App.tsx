import { useMemo, useState } from "react";
import getLocationInfo from "./services/geolocation";
import Map from "./components/Map";
import MissionCard from "./components/MissionCard";
import AltitudeChart from "./components/AltitudeChart";
import type { Mission } from "./types";

import "./App.css";

function App() {
  const [, setSelectedFile] = useState<File | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    null
  );
  const [hoverPosition, setHoverPosition] = useState<{
    lat: number;
    lng: number;
    index: number;
  } | null>(null);

  const generateRandomColor = (): string => {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);

    return `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
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
        if (event.data.messageType === "POS") {
          gpsData = event.data.messageList;
        }

        if (event.data.hasOwnProperty("messagesDoneLoading")) {
          if (gpsData) {
            console.log("[aec]gpsData:", gpsData);
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
                  alt: (gpsData as any).RelHomeAlt,
                  time_boot_ms: (gpsData as any).time_boot_ms,
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
          name: mission.fileName,
        })),
    [missions]
  );

  const selectedTrack = useMemo(() => {
    if (!selectedMissionId) return undefined;
    const mission = missions.find((m) => m.id === selectedMissionId);
    if (!mission) return undefined;
    const latArr = mission.trackPoints.lat || [];
    const lngArr = mission.trackPoints.lng || [];
    const altArr = mission.trackPoints.alt || [];
    const length = Math.min(latArr.length, lngArr.length);
    const result: { lat: number; lng: number; alt?: number }[] = [];
    for (let i = 0; i < length; i++) {
      const lat = latArr[i] / 10 ** 7;
      const lng = lngArr[i] / 10 ** 7;
      const alt = altArr[i];
      result.push(alt !== undefined ? { lat, lng, alt } : { lat, lng });
    }
    return result;
  }, [missions, selectedMissionId]);

  const handleMarkerClick = (markerData: {
    lat: number;
    lng: number;
    color?: string;
    name?: string;
  }) => {
    // Buscar la misión que corresponde a este marker
    const mission = missions.find(
      (m) =>
        m.fileName === markerData.name &&
        m.color === markerData.color &&
        !m.processing
    );

    if (mission) {
      setSelectedMissionId(mission.id);
    }
  };

  const selectedMission = useMemo(() => {
    return missions.find((m) => m.id === selectedMissionId);
  }, [missions, selectedMissionId]);

  const handleMouseOver = (data: {
    time: number;
    altitude: number;
    index: number;
  }) => {
    if (
      !selectedMission ||
      !selectedMission.trackPoints.lat ||
      !selectedMission.trackPoints.lng
    ) {
      return;
    }
    const latArray = selectedMission.trackPoints.lat;
    const lngArray = selectedMission.trackPoints.lng;
    const altArray = selectedMission.trackPoints.alt || [];
    const length = Math.min(latArray.length, lngArray.length, altArray.length);

    for (let i = 0; i < length; i++) {
      const lat = latArray[i] / 10 ** 7;
      const lng = lngArray[i] / 10 ** 7;
      const alt = altArray[i] || 0;
      if (alt === data.altitude) {
        setHoverPosition({ lat, lng, index: i });
      }
    }
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

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
              isSelected={selectedMissionId === mission.id}
              onSelect={() => setSelectedMissionId(mission.id)}
            />
          ))}
        </div>
      </div>
      <div className="main">
        <div className="map-container">
          <Map
            markers={allMarkers}
            className="map"
            selectedTrack={selectedTrack}
            hoverPosition={hoverPosition}
            onMarkerClick={handleMarkerClick}
          />
        </div>
        <div className="chart-container">
          {selectedMission && (
            <AltitudeChart
              trackPoints={selectedMission.trackPoints}
              missionColor={selectedMission.color}
              onMouseOver={handleMouseOver}
              onMouseLeave={handleMouseLeave}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
