import type { TrackPointsList } from "../App";
import "./MissionCard.css";

interface MissionCardProps {
  fileName: string;
  color: string;
  trackPoints: TrackPointsList;
  processing?: boolean;
  location?: string;
  onSelect: () => void;
  isSelected?: boolean;
}

const MissionCard = ({
  fileName,
  color,
  trackPoints,
  location,
  onSelect,
  processing,
  isSelected = false,
}: MissionCardProps) => {
  return (
    <div
      className={`mission-card ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="mission-card-header">
        <div
          className="mission-color-indicator"
          style={{ backgroundColor: color }}
        />
        <span className="mission-file-name">{fileName}</span>
        {processing && (
          <i
            className="fa-solid fa-spinner fa-spin loading-icon"
            aria-label="Procesando"
          />
        )}
      </div>
      <div className="mission-card-info">
        <span className="marker-count">
          {trackPoints.lat.length} puntos GPS
        </span>
      </div>
      {location && (
        <div className="mission-location">
          <span className="location-text">{location}</span>
        </div>
      )}
    </div>
  );
};

export default MissionCard;
