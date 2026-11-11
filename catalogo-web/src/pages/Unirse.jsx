import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Unirse() {
  const { token } = useParams();
  const [estado, setEstado] = useState("Validando invitación...");

  useEffect(() => {
    supabase.rpc("claim_role_invite", { p_token: token }).then(({ data, error }) => {
      if (error) {
        setEstado("Invitación inválida o ya usada.");
        return;
      }
      setEstado(`Ahora eres ${data}. Redirigiendo...`);
      // recarga completa para que AuthContext vuelva a leer el perfil
      setTimeout(() => (window.location.href = "/admin/soporte"), 1200);
    });
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center text-graphite">
      {estado}
    </div>
  );
}