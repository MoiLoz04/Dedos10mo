
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

export default function QuoteForm() {
  const {
    items,
    updateQuantity,
    removeItem,
    submitQuote,
    draftQuote,
  } = useCart();

  const {
    profile,
    user,
    updateProfile,
  } = useAuth();

  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: profile?.nombre_completo || "",
    email: user?.email || "",
    telefono: profile?.telefono || "",
    instrucciones: profile?.instrucciones_default || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState(null);
  const [error, setError] = useState("");

  // Precargar los datos guardados cuando llegue el perfil.
  useEffect(() => {
    if (!profile) return;

    setForm((anterior) => ({
      ...anterior,
      nombre: profile.nombre_completo || "",
      email: user?.email || anterior.email,
      telefono: profile.telefono || "",
      instrucciones: profile.instrucciones_default || "",
    }));
  }, [profile, user?.email]);

  function update(field, value) {
    setForm((anterior) => ({
      ...anterior,
      [field]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (items.length === 0) {
      setError(
        "Agrega al menos un producto antes de enviar la cotización."
      );
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // Guardar los datos de contacto del usuario.
      await updateProfile({
        nombre_completo: form.nombre.trim(),
        telefono: form.telefono.trim(),
        instrucciones_default: form.instrucciones,
      });

      // Enviar la cotización.
      const quote = await submitQuote({
        instrucciones_default: form.instrucciones,
      });

      setConfirmedRef(quote.referencia);
    } catch (err) {
      console.error("Error al enviar cotización:", err);

      setError(
        "Hubo un problema al guardar los datos o enviar la cotización. Intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmedRef) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <CheckCircle2
          size={56}
          className="text-brand-500 mx-auto mb-4"
        />

        <h1 className="font-display text-2xl font-semibold text-graphite mb-2">
          Cotización enviada
        </h1>

        <p className="text-steel mb-1">
          Tu referencia es:
        </p>

        <p className="font-mono text-xl font-semibold text-brand-600 mb-6">
          {confirmedRef}
        </p>

        <button
          onClick={() => navigate("/historial")}
          className="bg-graphite text-bone px-5 py-2.5 rounded-md font-medium hover:bg-graphite2 transition-colors"
        >
          Ver historial
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
      <h1 className="font-display text-2xl font-semibold text-graphite mb-6">
        Formulario de Cotización
      </h1>

      {error && (
        <p className="text-amber-600 text-sm bg-amber-500/10 rounded-md px-3 py-2 mb-5">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Productos seleccionados */}
        <div className="bg-white border border-black/5 rounded-lg p-5">
          <h2 className="font-display font-semibold text-graphite mb-4">
            Productos seleccionados
          </h2>

          {items.length === 0 ? (
            <p className="text-steel text-sm">
              No hay productos en tu cotización.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-steel text-xs font-mono uppercase border-b border-black/5">
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 text-center">Cantidad</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-black/5"
                  >
                    <td className="py-3 pr-2 text-graphite">
                      {item.nombre_producto}
                    </td>

                    <td className="py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.cantidad - 1
                            )
                          }
                          className="p-1 rounded bg-bone hover:bg-black/5"
                        >
                          <Minus size={12} />
                        </button>

                        <span className="font-mono w-6 text-center">
                          {item.cantidad}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.cantidad + 1
                            )
                          }
                          className="p-1 rounded bg-bone hover:bg-black/5"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>

                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-steel hover:text-amber-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {draftQuote && (
            <p className="text-xs font-mono text-steel mt-4">
              Folio en progreso: {draftQuote.referencia}
            </p>
          )}
        </div>

        {/* Datos de contacto */}
        <div className="bg-white border border-black/5 rounded-lg p-5">
          <h2 className="font-display font-semibold text-graphite mb-4">
            Datos de contacto
          </h2>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="text-xs font-mono text-steel uppercase">
                Nombre
              </label>

              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) =>
                  update("nombre", e.target.value)
                }
                className="w-full mt-1 border border-black/10 rounded-md px-3 py-2.5 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-steel uppercase">
                Business Email
              </label>

              <input
                type="email"
                required
                value={form.email}
                onChange={(e) =>
                  update("email", e.target.value)
                }
                className="w-full mt-1 border border-black/10 rounded-md px-3 py-2.5 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-steel uppercase">
                Teléfono
              </label>

              <input
                type="tel"
                value={form.telefono}
                onChange={(e) =>
                  update("telefono", e.target.value)
                }
                className="w-full mt-1 border border-black/10 rounded-md px-3 py-2.5 outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-steel uppercase">
                Instrucciones especiales
              </label>

              <textarea
                rows={3}
                value={form.instrucciones}
                onChange={(e) =>
                  update("instrucciones", e.target.value)
                }
                className="w-full mt-1 border border-black/10 rounded-md px-3 py-2.5 outline-none focus:border-brand-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-500 text-graphite font-medium py-2.5 rounded-md hover:bg-brand-600 hover:text-white transition-colors disabled:opacity-50 mt-2"
            >
              {submitting
                ? "Enviando..."
                : "Submit Quote Request"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
