import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function ChatPanel({ ticket }) {
  const { user, profile } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const fin = useRef(null);

  const nombre = profile?.nombre_completo || user?.email || "Usuario";

  async function cargar() {
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at");
    setMsgs(data || []);
  }

  useEffect(() => {
    cargar();
    const ch = supabase
      .channel(`chat_${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (p) => {
          if (p.eventType === "INSERT" && p.new.sender_id !== user.id) {
            setAviso(`Nuevo mensaje de ${p.new.sender_name}`);
            setTimeout(() => setAviso(""), 3000);
          }
          cargar();
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [ticket.id]);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const contador = useMemo(
    () =>
      msgs.reduce((a, m) => {
        a[m.sender_name] = (a[m.sender_name] || 0) + 1;
        return a;
      }, {}),
    [msgs]
  );

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim()) {
      setError("No puedes enviar un mensaje vacío.");
      return;
    }
    setError("");
    const { error } = await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      contenido: texto.trim(),
      sender_name: nombre,
      sender_role: profile?.role || "usuario",
    });
    if (error) {
      setError("No se pudo enviar. Revisa tu conexión.");
      return;
    }
    setTexto("");
    setAviso("Mensaje enviado ✓");
    setTimeout(() => setAviso(""), 2000);
    cargar();
  }

  async function subir(e) {
    const f = e.target.files[0];
    if (!f) return;
    const limpio = f.name.replace(/[^\w.\-]/g, "_");
    const path = `${ticket.id}/${Date.now()}_${limpio}`;
    const up = await supabase.storage.from("support-files").upload(path, f);
    if (up.error) {
      setError("No se pudo subir el archivo.");
      return;
    }
    await supabase.from("support_messages").insert({
      ticket_id: ticket.id,
      archivo_path: path,
      contenido: f.name,
      sender_name: nombre,
      sender_role: profile?.role || "usuario",
    });
    e.target.value = "";
    cargar();
  }

  async function abrirArchivo(path) {
    const { data } = await supabase.storage
      .from("support-files")
      .createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function limpiar() {
    if (!confirm("¿Borrar todo el historial de este caso?")) return;
    await supabase.from("support_messages").delete().eq("ticket_id", ticket.id);
    cargar();
  }

  return (
    <div className="flex flex-col h-[520px] bg-white border border-black/5 rounded-lg">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-black/5 text-xs font-mono">
        <span>
          {ticket.referencia} · {ticket.estado}
        </span>
        <span className="text-steel truncate">
          {Object.entries(contador)
            .map(([n, c]) => `${n}: ${c}`)
            .join(" | ")}
        </span>
        {profile?.role === "admin" && (
          <button
            onClick={limpiar}
            className="text-amber-600 flex items-center gap-1"
          >
            <Trash2 size={14} /> Limpiar
          </button>
        )}
      </div>

      {aviso && (
        <div className="bg-brand-50 text-brand-600 text-xs px-4 py-1">
          {aviso}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {msgs.map((m) => {
          const mio = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${mio ? "justify-end" : ""}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  mio ? "bg-brand-500 text-graphite" : "bg-bone"
                }`}
              >
                <p className="text-[10px] font-mono opacity-70">
                  {m.sender_name} · {m.sender_role}
                </p>
                {m.archivo_path ? (
                  <button
                    onClick={() => abrirArchivo(m.archivo_path)}
                    className="underline"
                  >
                    📎 {m.contenido}
                  </button>
                ) : (
                  <p>{m.contenido}</p>
                )}
                <p className="text-[10px] text-right opacity-60">
                  {new Date(m.created_at).toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={fin} />
      </div>

      {error && <p className="text-amber-600 text-xs px-4">{error}</p>}
      <form
        onSubmit={enviar}
        className="flex gap-2 p-3 border-t border-black/5"
      >
        <label className="p-2 cursor-pointer" aria-label="Adjuntar archivo">
          <Paperclip size={18} />
          <input type="file" hidden onChange={subir} />
        </label>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 border border-black/10 rounded-md px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button className="bg-brand-500 px-3 rounded-md" aria-label="Enviar">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}