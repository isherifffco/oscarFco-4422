import { createContext } from 'react';
import type { LoginFormValues, PublicUser, RegisterFormValues } from './auth.schemas';

export interface AuthContextValue {
  user: PublicUser | null;
  register: (values: RegisterFormValues) => Promise<PublicUser>;
  login: (values: LoginFormValues) => Promise<PublicUser>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
