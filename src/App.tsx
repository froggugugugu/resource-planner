import { Navigate, Route, Routes } from 'react-router-dom'
import { AssignmentPage } from '@/features/assignment/pages/AssignmentPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { TourMenuButton } from '@/features/guide-tour/components/TourMenuButton'
import { TourProvider } from '@/features/guide-tour/components/TourProvider'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { ProjectsPage } from '@/features/projects/pages/ProjectsPage'
import { WbsPage } from '@/features/projects/pages/WbsPage'
import { WbsSettingsPage } from '@/features/projects/pages/WbsSettingsPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { PhaseSettingsPage } from '@/features/schedule/pages/PhaseSettingsPage'
import { SchedulePage } from '@/features/schedule/pages/SchedulePage'
import { TeamPage } from '@/features/team/pages/TeamPage'
import { TechTagsPage } from '@/features/tech-tags/pages/TechTagsPage'
import { Layout } from '@/shared/components/Layout'
import { Toaster } from '@/shared/components/ui/toaster'

function App() {
  return (
    <>
      <Routes>
        {/* Landing page (no sidebar) */}
        <Route path="/" element={<LandingPage />} />

        {/* App pages (with sidebar layout) */}
        <Route
          path="*"
          element={
            <Layout sidebarExtra={<TourMenuButton />}>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route
                  path="/members"
                  element={<Navigate to="/team" replace />}
                />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/wbs" element={<WbsPage />} />
                <Route
                  path="/wbs-settings/:projectId"
                  element={<WbsSettingsPage />}
                />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route
                  path="/schedule-settings/:projectId"
                  element={<PhaseSettingsPage />}
                />
                <Route path="/assignment" element={<AssignmentPage />} />
                <Route path="/tech-tags" element={<TechTagsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
      <TourProvider />
      <Toaster />
    </>
  )
}

export default App
