import { useContext } from "react";
import { AuthContext } from "@/app/auth-context";

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth deve ser usado dentro de AppProviders.");
  }

  return value;
}
