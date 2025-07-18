import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import SubtitleUploader from './components/SubtitleUploader.jsx';
import AdBlockTestPage from './components/AdBlockTestPage.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<SubtitleUploader />} />
          <Route path="/adblock" element={<AdBlockTestPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;