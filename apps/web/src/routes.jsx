import App from './App.jsx';
import CompanyDetails from './pages/CompanyDetails.jsx';
import Landing from './pages/Landing.jsx';
import LeadScoringDashboard from './pages/LeadScoringDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

// Single source of truth for routes. Add a page: import it, add one line below.
export const routes = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'leads', element: <LeadScoringDashboard /> },
      { path: 'leads/:companyId', element: <CompanyDetails /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];
