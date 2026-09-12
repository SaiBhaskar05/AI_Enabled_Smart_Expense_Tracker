import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GroupProvider } from './context/GroupContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ChooseWorkspace } from './pages/ChooseWorkspace';
import { Expenses } from './pages/Expenses';
import { Budgets } from './pages/Budgets';
import { Groups } from './pages/Groups';
import { GroupDashboard } from './pages/GroupDashboard';
import { Analytics } from './pages/Analytics';
import { Reports } from './pages/Reports';
import { EmailReports } from './pages/EmailReports';
import { ImportExport } from './pages/ImportExport';
import { Categories } from './pages/Categories';
import { Settings } from './pages/Settings';
import { Bills } from './pages/Bills';

// Styles
import './styles/claymorphism.css';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <GroupProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route
              path="/choose-workspace"
              element={
                <ProtectedRoute>
                  <ChooseWorkspace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <GroupDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Expenses />
                </ProtectedRoute>
              }
            />
            <Route
              path="/budgets"
              element={
                <ProtectedRoute>
                  <Budgets />
                </ProtectedRoute>
              }
            />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
          <Route
            path="/import-export"
            element={
              <ProtectedRoute>
                <ImportExport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/email"
            element={
              <ProtectedRoute>
                <EmailReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bills"
            element={
              <ProtectedRoute>
                <Bills />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        </GroupProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
