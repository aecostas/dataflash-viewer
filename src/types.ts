export interface TrackPointsList {
  lat: number[];
  lng: number[];
  color?: string;
  alt?: number[];
  time_boot_ms?: number[];
}

export interface Mission {
  id: string;
  fileName: string;
  color: string;
  trackPoints: TrackPointsList;
  location?: string;
  processing?: boolean;
}
