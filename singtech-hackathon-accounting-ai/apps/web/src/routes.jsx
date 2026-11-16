import App from './App.jsx';
import AccountBookPage from './pages/AccountBook.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AssistantPage from './pages/AssistantPage.jsx';
import Landing from './pages/Landing.jsx';
import LandingPage from './pages/LandingPage.jsx';
import NotFound from './pages/NotFound.jsx';
import SignInPage from './pages/SignInPage.jsx';
import WorkspaceLayout from './pages/WorkspaceLayout.jsx';

// Single source of truth for routes. Add a page: import it, add one line below.
export const routes = [
  // SingTech AI product site and demo sign-in (own layout, no shared navbar).
  { path: '/', element: <LandingPage /> },
  { path: '/sign-in', element: <SignInPage /> },
  // SingTech AI workspace: sidebar shell, signed-in users only.
  {
    element: <WorkspaceLayout />,
    children: [
      { path: 'accounts', element: <AccountBookPage /> },
      { path: 'accounts/:accountId', element: <AccountPage /> },
      { path: 'assistant', element: <AssistantPage /> },
    ],
  },
  // Shared app shell: the scaffold welcome page moved from / to /dev.
  {
    element: <App />,
    children: [
      { path: 'dev', element: <Landing /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];
