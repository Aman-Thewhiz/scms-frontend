import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import TasksPage from './pages/TasksPage';
import TestsPage from './pages/TestsPage';
import ReportsPage from './pages/ReportsPage';
import ChatPage from './pages/ChatPage';
import NotesPage from './pages/NotesPage';
import AttendancePage from './pages/AttendancePage';
import CoursesPage from './pages/CoursesPage';
import StudentsPage from './pages/StudentsPage';
import FacultyPage from './pages/FacultyPage';
import DepartmentsPage from './pages/DepartmentsPage';
import FacilitiesPage from './pages/FacilitiesPage';
import NoticesPage from './pages/NoticesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute allowedRoles={['student', 'faculty']}>
              <SchedulePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <TasksPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tests"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <TestsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route
          path="/notes"
          element={
            <ProtectedRoute allowedRoles={['student', 'faculty']}>
              <NotesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute allowedRoles={['student', 'faculty']}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route path="/courses" element={<CoursesPage />} />
        <Route
          path="/students"
          element={
            <ProtectedRoute allowedRoles={['admin', 'faculty']}>
              <StudentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/faculty"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <FacultyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/departments"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/facilities"
          element={
            <ProtectedRoute allowedRoles={['admin', 'student']}>
              <FacilitiesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/notices" element={<NoticesPage />} />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route
        path="*"
        element={
          <ProtectedRoute>
            <NotFoundPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
