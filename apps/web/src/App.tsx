/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { StartSession } from './pages/StartSession';
import { RoleConfig } from './pages/RoleConfig';
import { SessionHistory } from './pages/SessionHistory';
import { ProjectContext } from './pages/ProjectContext';
import { Workspace } from './pages/Workspace';
import { TaskBoard } from './pages/TaskBoard';

import { SessionResult } from './pages/SessionResult';

export default function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}
