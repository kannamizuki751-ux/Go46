/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import ExamRoom from './pages/exam/ExamRoom';
import ExamList from './pages/exam/ExamList';
import History from './pages/exam/History';
import UsersManagement from './pages/admin/UsersManagement';
import ClassManagement from './pages/admin/ClassManagement';
import QuestionBank from './pages/guru/QuestionBank';
import ExamSchedule from './pages/guru/ExamSchedule';
import ExamApproval from './pages/guru/ExamApproval';
import Results from './pages/guru/Results';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected App Routes */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          
          {/* Siswa Routes */}
          <Route path="exams" element={<ExamList />} />
          <Route path="history" element={<History />} />
          
          {/* Guru Routes */}
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="schedule" element={<ExamSchedule />} />
          <Route path="approval" element={<ExamApproval />} />
          <Route path="results" element={<Results />} />
          
          {/* Admin Routes */}
          <Route path="users" element={<UsersManagement />} />
          <Route path="classes" element={<ClassManagement />} />
        </Route>

        {/* Specialized Exam Room (Full Screen, No Sidebar) */}
        <Route path="/exam/:examId" element={<ExamRoom />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

