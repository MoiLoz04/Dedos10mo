import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import ChatPanel from "../components/ChatPanel";

const vacio = { tipo: "falla", equipo: "", descripcion: "", prioridad: "Media", referencia: "" };

export default function Soporte() {
  const { user } = useAuth();
  const [form, setForm] = useState(vacio);
  const [tickets, setTickets] = useState([]);
  const [sel, setSel] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function cargar() {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setSel((s) => (s ? (data || []).find((t) => t.id === s.id) || null : s));
  }

  useEffect(() => {
    if (!user) return;
    cargar();
    const ch = supabase
      .channel(`mis_tickets_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets", filter: `user_id=eq.${user.id}` },
        () => cargar()
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user?.id]);

  async function crear(e) {
    e.preventDefault();
    setError("");
    setOk("");
    if (!form.equipo.trim() || !form.descripcion.trim()) {
      setError("Equipo y descripción son obligatorios.");
      return;
    }
    setEnviando(true);
    const payload = {
      tipo: form.tipo,
      equipo: form.equipo.trim(),
      descripcion: form.descripcion.trim(),
      prioridad: form.prioridad,
    };
    if (form.referencia.trim()) payload.referencia = form.referencia.trim().toUpperCase();

    const { data, error } = await supabase
      .from("support_tickets")
      .insert(payload)
      .select()
      .single();
    setEnviando(false);

    if (error) {
      setError(error.code === "23505" ? "Ese ID ya existe." : "No se pudo crear el caso.");
      return;
    }
    setOk(`Caso ${data.referencia} creado.`);
    setForm(vacio);
    setSel(data);
    cargar();
  }

  const input =
    "w-full mt-1 border border-black/10 rounded-md px-3 py-2.5 outline-none focus:border-brand-500";
  const label = "text-xs font-mono text-steel uppercase";

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-graphite mb-6">
        Soporte
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6">
          <form
            onSubmit={crear}
            className="bg-white border border-black/5 rounded-lg p-5 flex flex-col gap-3"
          >
            <h2 className="font-display font-semibold text-graphite">Nuevo caso</h2>
            {error && <p className="text-amber-600 text-sm">{error}</p>}
            {ok && <p className="text-brand-600 text-sm">{ok}</p>}

            <div>
              <label className={label}>Tipo</label>
              <select className={input} value={form.tipo} onChange={(e) => update("tipo", e.target.value)}>
                <option value="falla">Reporte de falla</option>
                <option value="atencion">Atención</option>
                <option value="acceso">Acceso perdido</option>
              </select>
            </div>
            <div>
              <label className={label}>Equipo</label>
              <input className={input} value={form.equipo} onChange={(e) => update("equipo", e.target.value)} />
            </div>
            <div>
              <label className={label}>Descripción</label>
              <textarea rows={3} className={`${input} resize-none`} value={form.descripcion} onChange={(e) => update("descripcion", e.target.value)} />
            </div>
            <div>
              <label className={label}>Prioridad</label>
              <select className={input} value={form.prioridad} onChange={(e) => update("prioridad", e.target.value)}>
                <option>Baja</option>
                <option>Media</option>
                <option>Alta</option>
              </select>
            </div>
            <div>
              <label className={label}>ID manual (opcional, ej. REP001)</label>
              <input className={input} value={form.referencia} onChange={(e) => update("referencia", e.target.value)} />
            </div>
            <button
              disabled={enviando}
              className="bg-brand-500 text-graphite font-medium py-2.5 rounded-md hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-50"
            >
              {enviando ? "Creando..." : "Crear caso"}
            </button>
          </form>

          <div className="bg-white border border-black/5 rounded-lg p-5">
            <h2 className="font-display font-semibold text-graphite mb-3">Mis casos</h2>
            {tickets.length === 0 ? (
              <p className="text-steel text-sm">Aún no tienes casos.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setSel(t)}
                      className={`w-full text-left py-3 px-2 rounded hover:bg-bone ${sel?.id === t.id ? "bg-bone" : ""}`}
                    >
                      <span className="font-mono text-sm text-graphite">{t.referencia}</span>
                      <span className="ml-2 text-xs text-steel">
                        {t.tipo} · {t.prioridad} · {t.estado}
                      </span>
                      <p className="text-sm text-steel truncate">{t.equipo}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          {sel ? (
            <ChatPanel key={sel.id} ticket={sel} />
          ) : (
            <p className="text-steel text-sm py-12 text-center">
              Selecciona o crea un caso para abrir el chat.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}