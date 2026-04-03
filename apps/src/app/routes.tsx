import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Scheduler from './pages/Scheduler';
import StaffManagement from './pages/StaffManagement';
import SwapsAndCoverage from './pages/SwapsAndCoverage';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Dashboard /></Layout>,
  },
  {
    path: '/scheduler',
    element: <Layout><Scheduler /></Layout>,
  },
  {
    path: '/staff',
    element: <Layout><StaffManagement /></Layout>,
  },
  {
    path: '/swaps',
    element: <Layout><SwapsAndCoverage /></Layout>,
  },
  {
    path: '/analytics',
    element: <Layout><Analytics /></Layout>,
  },
  {
    path: '/notifications',
    element: <Layout><Notifications /></Layout>,
  },
]);
