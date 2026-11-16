import WorkspaceShell from '../features/account-intelligence/shell/WorkspaceShell.jsx';

// Layout for the SingTech AI workspace routes: /accounts, /accounts/:accountId, /assistant.
// Signed-out users are sent to /sign-in.
export default function WorkspaceLayout() {
  return <WorkspaceShell />;
}
