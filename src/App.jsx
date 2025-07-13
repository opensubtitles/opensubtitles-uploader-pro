import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import SubtitleUploader from './components/SubtitleUploader.jsx';
import AdBlockTestPage from './components/AdBlockTestPage.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SubtitleUploader />} />
        <Route path="/adblock" element={<AdBlockTestPage />} />
      </Routes>
    </Router>
  );
}

export default App;