
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let activo = true;

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!activo) return;

        if (error) {
          console.error("Error al cargar perfil:", error.message);
          setProfile(null);
          return;
        }

        setProfile(data);
      });

    return () => {
      activo = false;
    };
  }, [user?.id]);

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  }

  async function signUp(email, password, nombre_completo) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre_completo },
      },
    });
  }

  async function signOut() {
    return supabase.auth.signOut();
  }

  // Guardar los datos de contacto en Supabase.
  async function updateProfile(datos) {
    if (!user?.id) {
      throw new Error("No hay un usuario autenticado.");
    }

    const cambios = {
      nombre_completo: datos.nombre_completo,
      telefono: datos.telefono,
      instrucciones_default: datos.instrucciones_default,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(cambios)
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      throw new Error(
        `No se pudo actualizar el perfil: ${error.message}`
      );
    }

    setProfile(data);

    return data;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        setProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
