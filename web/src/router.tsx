import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Projects from '@/pages/Projects';
import Upload from '@/pages/Create/Upload';
import Describe from '@/pages/Create/Describe';
import Editor from '@/pages/Editor/[projectId]';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import RequireAuth from '@/components/auth/RequireAuth';

const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/projects" element={
        <RequireAuth>
          <Projects />
        </RequireAuth>
      } />
      <Route path="/projects/new" element={
        <RequireAuth>
          <Upload />
        </RequireAuth>
      } />
      <Route path="/projects/new/describe" element={
        <RequireAuth>
          <Describe />
        </RequireAuth>
      } />
      <Route path="/editor/:projectId" element={
        <RequireAuth>
          <Editor />
        </RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Router;
