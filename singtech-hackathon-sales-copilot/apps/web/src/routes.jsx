import App from './App.jsx';
import { Navigate } from 'react-router';
import Login from './pages/Login.jsx';
import Workspace from './pages/Workspace.jsx';
import NotFound from './pages/NotFound.jsx';

// Single source of truth for routes. Add a page: import it, add one line below.
export const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/workspace" replace /> },
      { path: 'login', element: <Login /> },
      { path: 'workspace', element: <Workspace /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];
