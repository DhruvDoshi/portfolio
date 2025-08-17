import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface AuthenticatedUser {
  id?: string;
  userId: string;
  email: string;
  name: string;
}

export function verifyToken(request: NextRequest): AuthenticatedUser | null {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret'
    ) as AuthenticatedUser;

    return decoded;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export function getTokenFromCookie(request: NextRequest): AuthenticatedUser | null {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret'
    ) as AuthenticatedUser;

    return decoded;
  } catch (error) {
    console.error('Cookie token verification error:', error);
    return null;
  }
}

export function verifyAuth(request: NextRequest): AuthenticatedUser | null {
  // Try Bearer token first, then cookie
  const bearerAuth = verifyToken(request);
  if (bearerAuth) {
    return { ...bearerAuth, id: bearerAuth.userId };
  }
  
  const cookieAuth = getTokenFromCookie(request);
  if (cookieAuth) {
    return { ...cookieAuth, id: cookieAuth.userId };
  }
  
  return null;
}
