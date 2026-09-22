import { CameraNode, VehicleTrajectory, TrafficAlert } from '../../types/traffic';

export type BasemapType = 'dark' | 'satellite' | 'streets' | 'voyager';

export interface TrafficMapProps {
  cameras: CameraNode[];
  selectedCameraId?: string;
  onSelectCamera?: (cameraId: string) => void;
  activeTrajectory?: VehicleTrajectory | null;
  alerts?: TrafficAlert[];
  showHeatmap?: boolean;
  center?: [number, number];
  zoom?: number;
}
