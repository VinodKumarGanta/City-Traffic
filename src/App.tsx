import React from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { OverviewDashboard } from './views/OverviewDashboard';
import { ANPRTrajectoryView } from './views/ANPRTrajectoryView';
import { PredictiveIntelligenceView } from './views/PredictiveIntelligenceView';
import { LiveCameraFeedsView } from './views/LiveCameraFeedsView';
import { TrafficAnalyticsView } from './views/TrafficAnalyticsView';
import { AlertsConsoleView } from './views/AlertsConsoleView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { MobileView } from './views/MobileView';
import { CitizenCommuterView } from './views/CitizenCommuterView';
import { PublicChallanView } from './views/PublicChallanView';
import { GreenCorridorView } from './views/GreenCorridorView';
import { MobileAccessModal } from './components/common/MobileAccessModal';
import { TrafficStoreProvider, useTrafficStore } from './state/TrafficStore';

function CommandShell() {
  const s = useTrafficStore();
  const activeAlerts = s.alerts.filter((a) => a.status !== 'resolved').length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500 selection:text-slate-950">
      <Navbar
        currentCity={s.currentCity}
        onCityChange={s.setCurrentCity}
        onSearch={s.handleGlobalSearch}
        privacyMaskEnabled={s.privacyMaskEnabled}
        onTogglePrivacyMask={() => s.setPrivacyMaskEnabled(!s.privacyMaskEnabled)}
        activeAlertCount={activeAlerts}
        onOpenMobileQr={() => s.setIsMobileQrOpen(true)}
        connection={s.connection}
        onOpenAlerts={() => s.setCurrentView('alerts')}
      />

      <div className="flex-1 flex overflow-hidden pb-12 md:pb-0">
        <Sidebar
          currentView={s.currentView}
          onSelectView={s.setCurrentView}
          activeAlertsCount={activeAlerts}
        />

        <main className="flex-1 overflow-y-auto bg-[#090d16]">
          {s.currentView === 'overview' && (
            <OverviewDashboard
              cameras={s.cameras}
              selectedCamera={s.selectedCamera}
              onSelectCamera={s.setSelectedCameraId}
              activeTrajectory={s.activeTrajectory}
              alerts={s.alerts}
              kpis={s.kpis}
              latestDetection={s.latestDetection}
              privacyMaskEnabled={s.privacyMaskEnabled}
              onNavigateToView={s.setCurrentView}
              currentCity={s.currentCity}
            />
          )}
          {s.currentView === 'anpr' && (
            <ANPRTrajectoryView
              cameras={s.cameras}
              selectedCamera={s.selectedCamera}
              latestDetection={s.latestDetection}
              privacyMaskEnabled={s.privacyMaskEnabled}
              onSelectTrajectoryPlate={s.setActiveTrajectoryPlate}
            />
          )}
          {s.currentView === 'predictive' && (
            <PredictiveIntelligenceView cameras={s.cameras} />
          )}
          {s.currentView === 'cameras' && (
            <LiveCameraFeedsView
              cameras={s.cameras}
              selectedCamera={s.selectedCamera}
              onSelectCamera={s.setSelectedCameraId}
              latestDetection={s.latestDetection}
              privacyMaskEnabled={s.privacyMaskEnabled}
            />
          )}
          {s.currentView === 'analytics' && <TrafficAnalyticsView />}
          {s.currentView === 'alerts' && (
            <AlertsConsoleView
              alerts={s.alerts}
              privacyMaskEnabled={s.privacyMaskEnabled}
              onUpdateAlertStatus={s.handleUpdateAlertStatus}
            />
          )}
          {s.currentView === 'reports' && <ReportsView />}
          {s.currentView === 'settings' && (
            <SettingsView
              privacyMaskEnabled={s.privacyMaskEnabled}
              onTogglePrivacyMask={() => s.setPrivacyMaskEnabled(!s.privacyMaskEnabled)}
            />
          )}
          {s.currentView === 'mobile' && (
            <MobileView
              cameras={s.cameras}
              alerts={s.alerts}
              kpis={s.kpis}
              privacyMaskEnabled={s.privacyMaskEnabled}
            />
          )}
          {s.currentView === 'citizen' && (
            <CitizenCommuterView
              corridors={s.corridors}
              citizenReports={s.citizenReports}
              onAddCitizenReport={s.handleAddCitizenReport}
              onUpvoteReport={s.handleUpvoteReport}
            />
          )}
          {s.currentView === 'challan' && (
            <PublicChallanView
              challans={s.challans}
              onPayChallan={s.handlePayChallan}
              onDisputeChallan={s.handleDisputeChallan}
            />
          )}
          {s.currentView === 'greencorridor' && (
            <GreenCorridorView cameras={s.cameras} />
          )}
        </main>
      </div>

      <MobileAccessModal isOpen={s.isMobileQrOpen} onClose={() => s.setIsMobileQrOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <TrafficStoreProvider>
      <CommandShell />
    </TrafficStoreProvider>
  );
}

export default App;
