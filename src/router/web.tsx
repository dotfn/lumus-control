import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import { DemoPage } from '../pages/DemoPage';

export const webRouter = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/demo',
    element: <DemoPage />,
  },
  {
    // Las descargas viven ahora en la landing.
    path: '/download',
    element: <Navigate to="/#download" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
