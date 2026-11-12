/// Lógica pura de NewTicketScreen, extraída de `_crear()` para poder
/// probarla con pruebas unitarias (Práctica 11, WB-01 a WB-05).
/// No depende de Flutter, de Supabase ni de la red.
class TicketValidator {
  TicketValidator._();

  static const String mensajeCamposObligatorios =
      'Equipo y descripción son obligatorios';
  static const String mensajeReferenciaDuplicada = 'Ese ID ya existe';
  static const String mensajeErrorGenerico = 'No se pudo crear el caso';

  /// MÉTODO 1 (validación). V(G) = 3: un `if` con dos condiciones unidas por `||`.
  /// Devuelve null si los datos son válidos o el mensaje de error.
  static String? validar({
    required String equipo,
    required String descripcion,
  }) {
    if (equipo.trim().isEmpty || descripcion.trim().isEmpty) {
      return mensajeCamposObligatorios;
    }
    return null;
  }

  /// MÉTODO 2 (procesamiento). V(G) = 3: un `if` con dos condiciones unidas por `&&`.
  /// Normaliza los campos y arma el JSON que se envía a `support_tickets`.
  static Map<String, dynamic> construirPayload({
    required String tipo,
    required String equipo,
    required String descripcion,
    required String prioridad,
    String? referencia,
  }) {
    final payload = <String, dynamic>{
      'tipo': tipo,
      'equipo': equipo.trim(),
      'descripcion': descripcion.trim(),
      'prioridad': prioridad,
    };
    if (referencia != null && referencia.trim().isNotEmpty) {
      payload['referencia'] = referencia.trim().toUpperCase();
    }
    return payload;
  }

  /// Traduce el código SQLSTATE de Postgres a un mensaje para el usuario.
  /// '23505' = unique_violation (referencia repetida).
  static String mensajeParaError(String? codigoPostgres) =>
      codigoPostgres == '23505'
      ? mensajeReferenciaDuplicada
      : mensajeErrorGenerico;
}
