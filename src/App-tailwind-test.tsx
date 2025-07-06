import React from 'react';
import { TestPage } from './components/debug/TestPage';
import './globals.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <TestPage />
    </div>
  );
};

export default App;