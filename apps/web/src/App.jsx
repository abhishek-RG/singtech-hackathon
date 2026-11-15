import { Outlet } from 'react-router';
import Navbar from './components/Navbar.jsx';

// App shell: shared layout for every route. Pages render into <Outlet />.
export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
