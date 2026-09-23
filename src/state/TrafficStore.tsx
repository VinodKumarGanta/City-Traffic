import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  CameraNode,
  ANPRDetection,
  VehicleTrajectory,
  TrafficAlert,
  SystemKPIs,
  CitizenReport,
  EChallanRecord,
  CorridorRoadInfo,
} from '../types/traffic';
import { telemetryEngine } from '../services/telemetryEngine';
import { audioAlertService } from '../services/audioAlertService';
import { dbService, PostgresConnectionStatus } from '../services/dbService';
import type { ViewId } from '../components/layout/Sidebar';

const EMPTY_CAMERA: CameraNode = {
  id: 'CAM-NONE',
  sectorId: 'SEC-NONE',
  locationName: 'No Camera Online',
  lat: 17.43,
  lng: 78.41,
  status: 'offline',
  fps: 0,
  totalDetectionsToday: 0,
  headingDeg: 0,
  ipAddress: '0.0.0.0',
  model: 'YOLOv10-Edge',
};

interface TrafficStoreValue {
  currentView: ViewId;
  setCurrentView: (view: ViewId) => void;
  currentCity: string;
  setCurrentCity: (city: string) => void;
  cameras: CameraNode[];
  selectedCameraId: string;
  setSelectedCameraId: (id: string) => void;
  selectedCamera: CameraNode;
  activeTrajectoryPlate: string;
  setActiveTrajectoryPlate: (plate: string) => void;
  activeTrajectory: VehicleTrajectory | null;
  alerts: TrafficAlert[];
  latestDetection: ANPRDetection | null;
  privacyMaskEnabled: boolean;
  setPrivacyMaskEnabled: (v: boolean) => void;
  corridors: CorridorRoadInfo[];
  challans: EChallanRecord[];
  citizenReports: CitizenReport[];
  isMobileQrOpen: boolean;
  setIsMobileQrOpen: (v: boolean) => void;
  isLoading: boolean;
  loadError: string | null;
  kpis: SystemKPIs;
  connection: PostgresConnectionStatus | null;
  handleGlobalSearch: (query: string) => void;
  handleUpdateAlertStatus: (alertId: string, status: TrafficAlert['status']) => void;
  handleAddCitizenReport: (report: CitizenReport) => void;
  handleUpvoteReport: (reportId: string) => void;
  handlePayChallan: (challanId: string, txnId: string) => void;
  handleDisputeChallan: (challanId: string, reason: string) => void;
  reload: () => void;
}

const TrafficStoreContext = createContext<TrafficStoreValue | null>(null);

const VALID_VIEWS: ViewId[] = [
  'overview', 'anpr', 'predictive', 'quantum', 'cameras', 'analytics', 
  'alerts', 'reports', 'settings', 'mobile', 'citizen', 
  'challan', 'greencorridor'
];

const getInitialView = (): ViewId => {
  if (typeof window !== 'undefined' && window.location.hash) {
    const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (VALID_VIEWS.includes(raw as ViewId)) {
      return raw as ViewId;
    }
  }
  return 'overview';
};

export const TrafficStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewId>(getInitialView);
  const [currentCity, setCurrentCity] = useState('Hyderabad Command Center');
  const [cameras, setCameras] = useState<CameraNode[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [activeTrajectoryPlate, setActiveTrajectoryPlate] = useState('TS07JH4821');
  const [activeTrajectory, setActiveTrajectory] = useState<VehicleTrajectory | null>(null);
  const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
  const [latestDetection, setLatestDetection] = useState<ANPRDetection | null>(null);
  const [privacyMaskEnabled, setPrivacyMaskEnabled] = useState(false);
  const [corridors, setCorridors] = useState<CorridorRoadInfo[]>([]);
  const [challans, setChallans] = useState<EChallanRecord[]>([]);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>([]);
  const [isMobileQrOpen, setIsMobileQrOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connection, setConnection] = useState<PostgresConnectionStatus | null>(null);
  const [kpis, setKpis] = useState<SystemKPIs>({
    totalVehiclesToday: 0,
    anprAccuracyPercent: 96.8,
    activeAlertsCount: 0,
    avgCityTravelTimeMin: 18,
    congestionLevel: 'Moderate',
    predictedCongestionRisk: 'Low',
    predictedProbability: 25,
  });

  const pendingIncrements = useRef<Map<string, number>>(new Map());
  const flushTimer = useRef<number>(0);

  const selectedCamera = useMemo(
    () => cameras.find((c) => c.id === selectedCameraId) || cameras[0] || EMPTY_CAMERA,
    [cameras, selectedCameraId]
  );

  const reload = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const status = await dbService.testConnection();
      setConnection(status);
      const [cams, alts, chs, reps, cors, kpiData, traj] = await Promise.all([
        dbService.getCameras(),
        dbService.getAlerts(),
        dbService.getEChallans(),
        dbService.getCitizenReports(),
        dbService.getCorridors(),
        dbService.getKPIs(),
        dbService.getTrajectory(activeTrajectoryPlate),
      ]);
      if (cams) {
        setCameras(cams);
        if (cams.length > 0) {
          setSelectedCameraId((prev) => prev || cams[0].id);
        }
      }
      if (alts) setAlerts(alts);
      if (chs) setChallans(chs);
      if (reps) setCitizenReports(reps);
      if (cors) setCorridors(cors);
      if (kpiData) setKpis(kpiData);
      if (traj) setActiveTrajectory(traj);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load command data');
    } finally {
      setIsLoading(false);
    }
  }, [activeTrajectoryPlate]);

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!activeTrajectoryPlate) return;
    dbService.getTrajectory(activeTrajectoryPlate).then((traj) => {
      if (traj) setActiveTrajectory(traj);
    });
  }, [activeTrajectoryPlate]);

  useEffect(() => {
    const unsubscribe = telemetryEngine.subscribe((detection: ANPRDetection) => {
      setLatestDetection(detection);
      const map = pendingIncrements.current;
      map.set(detection.cameraId, (map.get(detection.cameraId) || 0) + 1);
      if (!flushTimer.current) {
        flushTimer.current = window.setTimeout(() => {
          const batch = new Map(pendingIncrements.current);
          pendingIncrements.current.clear();
          flushTimer.current = 0;
          let added = 0;
          setCameras((prev) =>
            prev.map((cam) => {
              const n = batch.get(cam.id);
              if (!n) return cam;
              added += n;
              return { ...cam, totalDetectionsToday: cam.totalDetectionsToday + n };
            })
          );
          setKpis((prev) => ({
            ...prev,
            totalVehiclesToday: prev.totalVehiclesToday + (added || [...batch.values()].reduce((a, b) => a + b, 0)),
          }));
        }, 250);
      }
    });
    return () => {
      unsubscribe();
      if (flushTimer.current) window.clearTimeout(flushTimer.current);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      if (VALID_VIEWS.includes(raw as ViewId)) {
        setCurrentView(raw as ViewId);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSetCurrentView = useCallback((view: ViewId) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view;
    }
  }, []);

  const handleGlobalSearch = (query: string) => {
    const upper = query.toUpperCase();
    const camMatch = cameras.find(
      (c) => c.id.toUpperCase() === upper || c.locationName.toUpperCase().includes(upper)
    );
    if (camMatch) {
      setSelectedCameraId(camMatch.id);
      setCurrentView('cameras');
      return;
    }
    setActiveTrajectoryPlate(upper);
    setCurrentView('anpr');
  };

  const handleUpdateAlertStatus = (alertId: string, newStatus: TrafficAlert['status']) => {
    setAlerts((prev) => prev.map((alt) => (alt.id === alertId ? { ...alt, status: newStatus } : alt)));
    dbService.updateAlertStatus(alertId, newStatus);
  };

  const handleAddCitizenReport = (report: CitizenReport) => {
    setCitizenReports((prev) => [report, ...prev]);
    const newAlert: TrafficAlert = {
      id: `ALT-CIT-${Date.now()}`,
      timestamp: 'Just now',
      type: report.category === 'accident' ? 'speeding' : 'predictive',
      title: `[CITIZEN] ${report.title}`,
      severity: report.category === 'accident' ? 'critical' : 'medium',
      plateNumber: 'N/A',
      cameraId: 'CAM-CITIZEN',
      locationName: report.locationName,
      lat: report.lat,
      lng: report.lng,
      details: `${report.description} (Tracking Ref: ${report.trackingId}, by ${report.reportedBy})`,
      status: 'active',
    };
    setAlerts((prev) => [newAlert, ...prev]);
    dbService.insertCitizenReport(report);
  };

  const handleUpvoteReport = (reportId: string) => {
    setCitizenReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, votes: r.votes + 1 } : r)));
    audioAlertService.playChime();
    dbService.upvoteCitizenReport(reportId);
  };

  const handlePayChallan = (challanId: string, txnId: string) => {
    setChallans((prev) =>
      prev.map((c) =>
        c.id === challanId
          ? { ...c, status: 'paid' as const, paidAt: 'Just now', paymentTxnId: txnId }
          : c
      )
    );
    dbService.payChallan(challanId, txnId);
  };

  const handleDisputeChallan = (challanId: string, reason: string) => {
    setChallans((prev) =>
      prev.map((c) => (c.id === challanId ? { ...c, status: 'disputed' as const, disputeReason: reason } : c))
    );
    dbService.disputeChallan(challanId, reason);
  };

  const value: TrafficStoreValue = {
    currentView,
    setCurrentView: handleSetCurrentView,
    currentCity,
    setCurrentCity,
    cameras,
    selectedCameraId,
    setSelectedCameraId,
    selectedCamera,
    activeTrajectoryPlate,
    setActiveTrajectoryPlate,
    activeTrajectory,
    alerts,
    latestDetection,
    privacyMaskEnabled,
    setPrivacyMaskEnabled,
    corridors,
    challans,
    citizenReports,
    isMobileQrOpen,
    setIsMobileQrOpen,
    isLoading,
    loadError,
    kpis,
    connection,
    handleGlobalSearch,
    handleUpdateAlertStatus,
    handleAddCitizenReport,
    handleUpvoteReport,
    handlePayChallan,
    handleDisputeChallan,
    reload,
  };

  return <TrafficStoreContext.Provider value={value}>{children}</TrafficStoreContext.Provider>;
};

export function useTrafficStore(): TrafficStoreValue {
  const ctx = useContext(TrafficStoreContext);
  if (!ctx) throw new Error('useTrafficStore must be used within TrafficStoreProvider');
  return ctx;
}
