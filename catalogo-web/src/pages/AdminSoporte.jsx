import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import ChatPanel from "../components/ChatPanel";

export default function AdminSoporte() {
  const { profile } = useAuth();
  const esAdmin = profile?.role === "admin";
  const [tickets, setTickets] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [selId, setSelId] = useState(null);
  const [msg, setMsg] = useState("");

  const sel = tickets.find((t) => t.id === selId) || null;

  async function cargar() {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    setTickets(data || []);
  }

  useEffect(() => {
    cargar();
    if (esAdmin) {
      supabase.rpc("list_agents").then(({ data }) => setAgentes(data || []));
    }
    const ch = supabase
      .channel("admin_tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => cargar())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [esAdmin]);

  async function actualizar(cambios) {
    setMsg("");
    const { data, error } = await supabase
      .from("support_tickets")
      .update(cambios)
      .eq("id", sel.id)
      .select();
    if (error || !data?.length) {
      setMsg("No se pudo actualizar (revisa permisos).");
      return;
    }
    setMsg("Actualizado ✓");
    cargar();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el caso ${sel.referencia}?`)) return;
    const { error } = await supabase.from("support_tickets").delete().eq("id", sel.id);
    if (error) {
      setMsg("No se pudo eliminar.");
      return;
    }
    setSelId(null);
    cargar();
  }

  const sm = "border border-black/10 rounded-md px-2 py-1.5 text-sm bg-white";

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-graphite mb-6">
        Panel de soporte{" "}
        <span className="text-xs font-mono text-steel">({profile?.role})</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="bg-white border border-black/5 rounded-lg overflow-y-auto max-h-[640px]">
          {tickets.length === 0 ? (
            <p className="text-steel text-sm p-5">No hay casos.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelId(t.id)}
                    className={`w-full text-left p-3 hover:bg-bone ${selId === t.id ? "bg-bone" : ""}`}
                  >
                    <div className="flex justify-between">
                      <span className="font-mono text-sm">{t.referencia}</span>
                      <span
                        className={`text-xs font-mono ${
                          t.prioridad === "Alta" ? "text-amber-600" : "text-steel"
                        }`}
                      >
                        {t.prioridad}
                      </span>
                    </div>
                    <p className="text-sm text-steel truncate">
                      {t.equipo} · {t.estado}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {!sel ? (
            <p className="text-steel text-sm py-12 text-center">
              Selecciona un caso.
            </p>
          ) : (
            <>
              <div className="bg-white border border-black/5 rounded-lg p-4">
                <p className="text-sm text-graphite mb-3">
                  <b>{sel.tipo}</b> — {sel.descripcion}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={sm}
                    value={sel.prioridad}
                    onChange={(e) => actualizar({ prioridad: e.target.value })}
                  >
                    <option>Baja</option>
                    <option>Media</option>
                    <option>Alta</option>
                  </select>
                  <select
                    className={sm}
                    value={sel.estado}
                    onChange={(e) => actualizar({ estado: e.target.value })}
                  >
                    <option value="abierto">abierto</option>
                    <option value="en atención">en atención</option>
                    <option value="resuelto">resuelto</option>
                  </select>
                  {esAdmin && (
                    <>
                      <select
                        className={sm}
                        value={sel.agente_id || ""}
                        onChange={(e) =>
                          e.target.value &&
                          actualizar({ agente_id: e.target.value, estado: "en atención" })
                        }
                      >
                        <option value="">Asignar agente…</option>
                        {agentes.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nombre_completo}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={eliminar}
                        className="text-amber-600 text-sm border border-amber-500/40 rounded-md px-3 py-1.5"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                  {msg && <span className="text-xs font-mono text-steel">{msg}</span>}
                </div>
              </div>
              <ChatPanel key={sel.id} ticket={sel} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}