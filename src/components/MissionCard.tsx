import "./MissionCard.css";

interface MissionCardProps {
  fileName: string;
  color: string;
  markerCount: number;
  onSelect: () => void;
  isSelected?: boolean;
}

const MissionCard = ({
  fileName,
  color,
  markerCount,
  onSelect,
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
      </div>
      <div className="mission-card-info">
        <span className="marker-count">{markerCount} puntos GPS</span>
      </div>
    </div>
  );
};

export default MissionCard;
