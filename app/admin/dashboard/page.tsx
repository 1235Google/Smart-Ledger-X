'use client';
import React from 'react';
import AdminDashboard from '../../../src/pages/admin/AdminDashboard';
import AdminLayout from '../../../src/pages/admin/AdminLayout';
import { StoreProvider } from '../../../src/context/StoreContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export default function AdminDashboardPage() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
