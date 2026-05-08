/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { StartSession } from './pages/StartSession';
import { RoleConfig } from './pages/RoleConfig';
import { SessionHistory } from './pages/SessionHistory';
import { ProjectContext } from './pages/ProjectContext';
import { Workspace } from './pages/Workspace';
import { TaskBoard } from './pages/TaskBoard';
import { SessionResult } from './pages/SessionResult';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/workspace" element={<Workspace />} />
      <Route path="/project-context" element={<ProjectContext />} />
      <Route path="/start-session" element={<StartSession />} />
      <Route path="/role-config" element={<RoleConfig />} />
      <Route path="/session-history" element={<SessionHistory />} />
      <Route path="/session-result" element={<SessionResult />} />
      <Route path="/task-board" element={<TaskBoard />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
