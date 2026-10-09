import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const MINUTOS = 2;

export default function LinkMobile() {
  const { user } = useAuth();
  const [token, setToken] = useState(null);
  const [error, setError] = useState('');

  async function generar() {
    setError('');
    const nuevo = crypto.randomUUID();
    const expires_at = new Date(Date.now() + MINUTOS * 60 * 1000).toISOString();
    const { error } = await supabase
      .from('qr_sessions')
      .insert({ token: nuevo, expires_at, user_id: user.id });

    if (error) {
      setToken(null);
      setError('No se pudo generar el código. Intenta de nuevo.');
      return;
    }
    setToken(nuevo);
  }

  useEffect(() => {
    if (user) generar();
  }, [user]);

  return (
    <div className='max-w-md mx-auto px-4 py-16 text-center'>
      <h1 className='font-display text-2xl font-semibold text-graphite mb-2'>
        Vincular app móvil
      </h1>
      <p className='text-steel text-sm mb-6'>
        Abre IndustrIA Mobile, inicia sesión y escanea este código. Vence en {MINUTOS} minutos.
      </p>
      {error && <p className='text-amber-600 text-sm mb-4'>{error}</p>}
      {token && (
        <div className='inline-block bg-white p-4 rounded-lg border border-black/5'>
          <QRCodeSVG value={token} size={220} />
        </div>
      )}
      <div className='mt-6'>
        <button
          onClick={generar}
          className='bg-brand-500 text-graphite font-medium px-4 py-2.5 rounded-md hover:bg-brand-600 hover:text-white transition-colors'
        >
          Generar nuevo código
        </button>
      </div>
    </div>
  );
}