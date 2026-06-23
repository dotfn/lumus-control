import React from 'react';
import { DemoProvider } from '../context/DemoContext';
import { ControlPage } from './ControlPage';

export const DemoPage: React.FC = () => {
  React.useEffect(() => {
    document.title = 'Demo interactiva — Lumus Control';
  }, []);

  return (
    <DemoProvider isDemo={true}>
      <ControlPage />
    </DemoProvider>
  );
};
