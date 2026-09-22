export interface CameraNode {
  id: string;
  sectorId: string;
  locationName: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline' | 'warning';
  fps: number;
  totalDetectionsToday: number;
  headingDeg: number;
  ipAddress: string;
  model: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ANPRDetection {
  id: string;
  timestamp: string;
  plateNumber: string;
  plateHash: string; // SHA-256 privacy hash
  cameraId: string;
  cameraName: string;
  confidence: number;
  speedKmh: number;
  vehicleColor: string;
  vehicleType: 'Sedan' | 'SUV' | 'Truck' | 'Motorcycle' | 'Bus';
  boundingBox: BoundingBox;
  stnApplied: boolean;
  skewAngle: number;
  ocrExecutionTimeMs: number;
}

export interface TrajectoryCheckpoint {
  timestamp: string;
  cameraId: string;
  locationName: string;
  lat: number;
  lng: number;
  speedKmh: number;
  confidence: number;
}

export interface VehicleTrajectory {
  plateNumber: string;
  plateHash: string;
  vehicleType: string;
  vehicleColor: string;
  totalDetections: number;
  startTime: string;
  endTime: string;
  checkpoints: TrajectoryCheckpoint[];
  pathCoordinates: [number, number][]; // [lat, lng]
}

export type AlertType = 
  | 'blacklist' 
  | 'teleportation' 
  | 'looping' 
  | 'speeding' 
  | 'predictive';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface TrafficAlert {
  id: string;
  timestamp: string;
  type: AlertType;
  title: string;
  severity: AlertSeverity;
  plateNumber: string;
  cameraId: string;
  locationName: string;
  lat: number;
  lng: number;
  details: string;
  teleportSpeedKmh?: number; // for cloned plate anomaly (S = delta_d / delta_t)
  distanceKm?: number;
  timeDiffSec?: number;
  status: 'active' | 'investigating' | 'resolved';
  assignedOperator?: string;
}

export interface PredictiveState {
  roadSegmentId: string;
  segmentName: string;
  horizonMinutes: number; // 5, 10, 15
  congestionProbability: number; // 0 - 100%
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  predictedSpeedKmh: number;
  currentSpeedKmh: number;
  predictedTravelTimeMin: number;
  currentTravelTimeMin: number;
  explainability: {
    factor: string;
    changePercent: number;
    impact: 'negative' | 'positive' | 'neutral';
  }[];
  recommendedAction: string;
  actionApproved?: boolean;
}

export interface ODMatrixItem {
  id: string;
  originZone: string;
  destinationZone: string;
  vehicleCount: number;
  avgTravelTimeMin: number;
  congestionIndex: number;
}

export interface SystemKPIs {
  totalVehiclesToday: number;
  anprAccuracyPercent: number;
  activeAlertsCount: number;
  avgCityTravelTimeMin: number;
  congestionLevel: 'Low' | 'Moderate' | 'High' | 'Severe';
  predictedCongestionRisk: 'Low' | 'Moderate' | 'High' | 'Critical';
  predictedProbability: number;
}

export interface SectorSummary {
  sectorId: string;
  sectorName: string;
  cameraCount: number;
  activeVehicles: number;
  avgSpeedKmh: number;
  congestionStatus: 'Clear' | 'Moderate' | 'Congested' | 'Gridlock';
}

export type CitizenReportCategory = 
  | 'accident' 
  | 'stalled_vehicle' 
  | 'waterlogging' 
  | 'signal_failure' 
  | 'severe_pothole' 
  | 'illegal_parking';

export interface CitizenReport {
  id: string;
  trackingId: string;
  timestamp: string;
  category: CitizenReportCategory;
  title: string;
  description: string;
  locationName: string;
  lat: number;
  lng: number;
  photoUrl?: string;
  status: 'reported' | 'investigating' | 'dispatched' | 'resolved';
  votes: number;
  reportedBy: string;
}

export interface EChallanRecord {
  id: string;
  challanNumber: string;
  plateNumber: string;
  violationType: 'Speeding' | 'Red Light' | 'Cloned Plate' | 'No Helmet' | 'Illegal Lane Departure';
  fineAmountInr: number;
  timestamp: string;
  locationName: string;
  cameraId: string;
  recordedSpeedKmh?: number;
  speedLimitKmh?: number;
  status: 'pending' | 'paid' | 'disputed';
  snapshotUrl?: string;
  paidAt?: string;
  paymentTxnId?: string;
  disputeReason?: string;
}

export interface GreenCorridorState {
  active: boolean;
  emergencyType: 'ambulance' | 'fire' | 'police' | 'organ';
  unitId: string;
  originName: string;
  destinationName: string;
  hospitalName: string;
  pathCoordinates: [number, number][];
  clearedNodeIds: string[];
  normalDurationMin: number;
  priorityDurationMin: number;
  timeSavedMin: number;
  activatedAt?: string;
}

export interface CorridorRoadInfo {
  id: string;
  name: string;
  city: string;
  status: 'clear' | 'moderate' | 'congested' | 'gridlock';
  currentSpeedKmh: number;
  normalSpeedKmh: number;
  travelTimeMin: number;
  normalTravelTimeMin: number;
  lengthKm: number;
  congestionPercent: number;
  activeIncidents: number;
}
