import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Projects from '@/pages/Projects';
import Upload from '@/pages/Create/Upload';
import Analyze from '@/pages/Create/Analyze';
import Describe from '@/pages/Create/Describe';
import Generate from '@/pages/Create/Generate';
import Editor from '@/pages/Editor/[projectId]';
import Login from '@/pages/Login';
import Settings from '@/pages/Settings';
import Home from '@/pages/Home';
import Community from '@/pages/Community';
import Tutorials from '@/pages/Tutorials';
import Pricing from '@/pages/Pricing';
import RequireAuth from '@/components/auth/RequireAuth';

const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/community" element={<Community />} />
      <Route path="/tutorials" element={<Tutorials />} />
      <Route path="/pricing" element={<Pricing />} />
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
      <Route path="/projects/new/analyze" element={
        <RequireAuth>
          <Analyze />
        </RequireAuth>
      } />
      <Route path="/projects/new/generate" element={
        <RequireAuth>
          <Generate />
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
      <Route path="/settings" element={
        <RequireAuth>
          <Settings />
        </RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Router;
