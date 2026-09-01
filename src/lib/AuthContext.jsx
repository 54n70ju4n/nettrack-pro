import React, { createContext, useContext } from 'react';

// Backend-free build: there is no authentication. This context keeps the same
// shape the app consumed from the Base44 version so no consumer needs changes,
// but it always reports a single implicit local user and never blocks render.

const AuthContext = createContext(null);

const LOCAL_USER = { id: 'local', full_name: 'Usuario local', email: '' };

const VALUE = {
  user: LOCAL_USER,
  isAuthenticated: true,
  isLoadingAuth: false,
  isLoadingPublicSettings: false,
  authError: null,
  appPublicSettings: null,
  authChecked: true,
  logout: () => {},
  navigateToLogin: () => {},
  checkUserAuth: () => {},
  checkAppState: () => {},
};

export const AuthProvider = ({ children }) => (
  <AuthContext.Provider value={VALUE}>{children}</AuthContext.Provider>
);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
