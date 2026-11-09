
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();

  const [draftQuote, setDraftQuote] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Consultar los productos del borrador.
  const refreshItems = useCallback(async (quoteId) => {
    if (!quoteId) {
      setItems([]);
      return [];
    }

    const { data, error } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error consultando productos:", error);
      throw error;
    }

    setItems(data || []);
    return data || [];
  }, []);

  // Recuperar o crear el borrador.
  const loadOrCreateDraft = useCallback(async () => {
    if (!user) {
      setDraftQuote(null);
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: existing, error: searchError } =
        await supabase
          .from("quotes")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "borrador")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (searchError) throw searchError;

      let quote = existing;

      if (!quote) {
        const { data: created, error: createError } =
          await supabase
            .from("quotes")
            .insert({
              user_id: user.id,
              status: "borrador",
              enviado_desde: "web",
            })
            .select()
            .single();

        if (createError) throw createError;

        quote = created;
      }

      setDraftQuote(quote);
      await refreshItems(quote.id);

      return quote;
    } catch (error) {
      console.error(
        "Error cargando borrador de cotización:",
        error
      );
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user?.id, refreshItems]);

  useEffect(() => {
    loadOrCreateDraft().catch(console.error);
  }, [loadOrCreateDraft]);

  // Mantener sincronización con cambios externos.
  useEffect(() => {
    if (!draftQuote?.id) return;

    const quoteId = draftQuote.id;

    const channel = supabase
      .channel(`quote_items_${quoteId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quote_items",
          filter: `quote_id=eq.${quoteId}`,
        },
        () => {
          refreshItems(quoteId).catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [draftQuote?.id, refreshItems]);

  // Agregar producto.
  async function addToCart(product) {
    if (!draftQuote) {
      throw new Error("No existe un borrador activo.");
    }

    const existing = items.find(
      (item) => item.product_id === product.id
    );

    if (existing) {
      const { error } = await supabase
        .from("quote_items")
        .update({
          cantidad: existing.cantidad + 1,
        })
        .eq("id", existing.id)
        .eq("quote_id", draftQuote.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("quote_items")
        .insert({
          quote_id: draftQuote.id,
          product_id: product.id,
          nombre_producto: product.nombre,
          cantidad: 1,
        });

      if (error) throw error;
    }

    await refreshItems(draftQuote.id);
  }

  // Modificar cantidad.
  async function updateQuantity(itemId, cantidad) {
    if (!draftQuote) return;

    if (cantidad <= 0) {
      return removeItem(itemId);
    }

    const { error } = await supabase
      .from("quote_items")
      .update({ cantidad })
      .eq("id", itemId)
      .eq("quote_id", draftQuote.id);

    if (error) throw error;

    await refreshItems(draftQuote.id);
  }

  // Eliminar producto.
  async function removeItem(itemId) {
    if (!draftQuote) return;

    const { data, error } = await supabase
      .from("quote_items")
      .delete()
      .eq("id", itemId)
      .eq("quote_id", draftQuote.id)
      .select("id");

    if (error) {
      console.error("Error eliminando producto:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error(
        "No se eliminó el producto. Revisa los permisos de Supabase."
      );
    }

    // Actualizar inmediatamente el estado de React.
    setItems((previous) =>
      previous.filter((item) => item.id !== itemId)
    );

    // Confirmar el estado real de la base de datos.
    await refreshItems(draftQuote.id);
  }

  // Enviar cotización.
  async function submitQuote({ instrucciones_default }) {
    if (!draftQuote) {
      throw new Error("No existe una cotización activa.");
    }

    if (instrucciones_default !== undefined && user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ instrucciones_default })
        .eq("id", user.id);

      if (profileError) throw profileError;
    }

    const { data, error } = await supabase
      .from("quotes")
      .update({ status: "enviada" })
      .eq("id", draftQuote.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    setDraftQuote(null);
    setItems([]);

    // Crear un nuevo borrador vacío.
    await loadOrCreateDraft();

    return data;
  }

  const totalItems = items.reduce(
    (total, item) => total + item.cantidad,
    0
  );

  return (
    <CartContext.Provider
      value={{
        draftQuote,
        items,
        loading,
        totalItems,
        addToCart,
        updateQuantity,
        removeItem,
        submitQuote,
        refreshItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
