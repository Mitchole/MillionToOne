import React from 'react';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

export default App;
