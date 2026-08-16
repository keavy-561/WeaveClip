import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import Projects from '@/pages/Projects';
import Upload from '@/pages/Create/Upload';
import Describe from '@/pages/Create/Describe';
import Editor from '@/pages/Editor/[projectId]';

const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects/new" element={<Upload />} />
      <Route path="/projects/new/describe" element={<Describe />} />
      <Route path="/editor/:projectId" element={<Editor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Router;
