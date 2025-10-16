import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * PrefixRedirect
 * - Redirects current path by prefixing a base (e.g., "/app")
 * - Example: when mounted on path="/programs/*", it redirects
 *   "/programs/ad-mining" -> "/app/programs/ad-mining"
 */
export default function PrefixRedirect({ prefix }: { prefix: string }) {
  const location = useLocation();
  const target = `${prefix}${location.pathname}`;
  return <Navigate to={target} replace />;
}
