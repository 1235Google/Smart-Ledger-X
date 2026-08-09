'use client';
import React from 'react';
import AdminLogin from '../../src/pages/admin/AdminLogin';
import { StoreProvider } from '../../src/context/StoreContext';
import { BrowserRouter } from 'react-router-dom';

export default function AdminPage() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <AdminLogin />
      </BrowserRouter>
    </StoreProvider>
  );
}
