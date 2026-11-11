import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleRoute({ roles, children }) {
  const { profile, loading } = useAuth();
  if (loading || !profile) return null;
  return roles.includes(profile.role) ? children : <Navigate to="/" replace />;
}