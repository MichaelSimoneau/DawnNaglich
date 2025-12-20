import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { User, UserRole } from './types';
import { ADMIN_EMAILS } from './constants';

interface UserContextType {
  user: User | null;
  initializing: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, initializing: true });

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!auth) { setInitializing(false); return; }
    const subscriber = onAuthStateChanged(auth, (u) => {
      if (u) {
        const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === u.email?.toLowerCase());
        setUser({ 
          id: u.uid, 
          email: u.email!, 
          name: u.displayName || 'Guest', 
          role: isAdmin ? UserRole.ADMIN : UserRole.CLIENT 
        });
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return subscriber;
  }, []);

  return (
    <UserContext.Provider value={{ user, initializing }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

