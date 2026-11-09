
  import { test, expect } from "@playwright/test";
  import { createClient } from "@supabase/supabase-js";
  import fs from "node:fs";
  import path from "node:path";

  // ============================================================
  // PRÁCTICA 8 — INDUSTRIA
  // PRUEBAS DE CAJA NEGRA CON PLAYWRIGHT
  // TOTAL: 16 PRUEBAS
  // ============================================================

  const env = process.env;

  const USER_A = {
    email: env.TEST_USER_A_EMAIL,
    password: env.TEST_USER_A_PASSWORD,
  };

  const USER_B = {
    email: env.TEST_USER_B_EMAIL,
    password: env.TEST_USER_B_PASSWORD,
  };

  const EVID_DIR = "evidencias";
  fs.mkdirSync(EVID_DIR, { recursive: true });

  // ============================================================
  // FUNCIONES AUXILIARES
  // ============================================================

  async function captura(page, nombre) {
    await page.screenshot({
      path: path.join(EVID_DIR, `${nombre}.png`),
      fullPage: true,
    });
  }

  function guardarJson(nombre, objeto) {
    fs.writeFileSync(
      path.join(EVID_DIR, `${nombre}.json`),
      JSON.stringify(objeto, null, 2),
      "utf-8"
    );
  }

  async function anotar(page, texto) {
    await page.evaluate((mensaje) => {
      const anterior = document.querySelector(
        "[data-anotacion-prueba]"
      );

      if (anterior) anterior.remove();

      const elemento = document.createElement("div");
      elemento.setAttribute("data-anotacion-prueba", "1");
      elemento.textContent =
        "ANOTACIÓN DE PRUEBA: " + mensaje;

      elemento.style.cssText = `
        position:fixed;
        left:0;
        right:0;
        bottom:0;
        z-index:99999;
        background:#fff3cd;
        color:#000;
        font:14px monospace;
        padding:10px;
        border-top:2px solid #f59e0b;
      `;

      document.body.appendChild(elemento);
    }, texto);
  }

  async function apiCliente(usuario) {
    const c = createClient(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } =
      await c.auth.signInWithPassword(usuario);

    if (error) {
      throw new Error(
        `Error de autenticación API: ${error.message}`
      );
    }

    return {
      c,
      userId: data.user.id,
    };
  }

  async function limpiarBorrador(usuario) {
    const { c, userId } = await apiCliente(usuario);

    const { data: borradores, error } = await c
      .from("quotes")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "borrador");

    if (error) throw error;

    for (const q of borradores || []) {
      const { error: errorEliminar } = await c
        .from("quote_items")
        .delete()
        .eq("quote_id", q.id);

      if (errorEliminar) throw errorEliminar;
    }
  }

  async function login(page, usuario) {
    await page.goto("/login");

    await page
      .getByPlaceholder("nombre@empresa.com")
      .fill(usuario.email);

    await page
      .locator('input[type="password"]')
      .fill(usuario.password);

    await page
      .getByRole("button", { name: "Entrar" })
      .click();

    await expect(page).toHaveURL(/\/$/);

    await expect(
      page.getByRole("heading", {
        name: "Catálogo Industrial",
      })
    ).toBeVisible();

    await expect(
      page.locator("h3").first()
    ).toBeVisible();
  }

  async function agregarPrimerProducto(page) {
    const lateral = page.locator("aside");

    await expect(lateral).toBeVisible();

    const cantidadInicial =
      await lateral.locator("li").count();

    if (cantidadInicial === 0) {
      await page
        .getByRole("button", {
          name: /Add to Quote/,
        })
        .first()
        .click();
    }

    await expect
      .poll(
        async () => lateral.locator("li").count(),
        { timeout: 15000 }
      )
      .toBeGreaterThan(0);
  }

  async function llenarFormularioYEnviar(
    page,
    { nombre, telefono, instrucciones }
  ) {
    const formulario = page
      .getByRole("main")
      .locator("form");

    await formulario
      .locator('input[type="text"]')
      .fill(nombre);

    await formulario
      .locator('input[type="tel"]')
      .fill(telefono);

    await formulario
      .locator("textarea")
      .fill(instrucciones);

    await formulario
      .getByRole("button", {
        name: "Submit Quote Request",
      })
      .click();
  }

  // ============================================================
  // AUTENTICACIÓN Y REGISTRO
  // ============================================================

  test.describe("Autenticación y registro", () => {

    // ----------------------------------------------------------
    // TC-001 — REGISTRO CON DATOS VÁLIDOS
    // ----------------------------------------------------------

    test(
      "TC-001 [RF-001] Registro con datos válidos",
      async ({ page }) => {
      const dominio = env.TEST_REGISTER_EMAIL_DOMAIN;

  if (!dominio) {
    throw new Error(
      "Configura TEST_REGISTER_EMAIL_DOMAIN con un dominio real que controles."
    );
  }

  const email = `practica8${Date.now()}@${dominio}`;
        await page.goto("/register");

        await page
          .locator('form input[type="text"]')
          .fill("Usuario Prueba P8");

        await page
          .locator('form input[type="email"]')
          .fill(email);

        await page
          .locator('form input[type="password"]')
          .fill("Abc123");

        await captura(
          page,
          "TC-001_a_formulario_lleno"
        );

        await page
          .getByRole("button", {
            name: "Crear cuenta",
          })
          .click();

        const confirmacion = page.getByText(
          "Cuenta creada. Redirigiendo a inicio de sesión..."
        );

        try {
          await expect(confirmacion).toBeVisible({
            timeout: 15000,
          });
        } catch (error) {
          const mensajes = await page
            .locator("form p")
            .allTextContents();

          await captura(
            page,
            "TC-001_error_registro"
          );

          throw new Error(
            `No se completó el registro de ${email}. ` +
            `Mensajes: ${JSON.stringify(mensajes)}. ` +
            `Error original: ${error.message}`
          );
        }

        await captura(
          page,
          "TC-001_b_confirmacion"
        );

        await expect(page).toHaveURL(/\/login$/, {
          timeout: 6000,
        });

        await captura(
          page,
          "TC-001_c_redireccion_login"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-006 — CONTRASEÑA DE 5 CARACTERES
    // ----------------------------------------------------------

    test(
      "TC-006 [RF-005] Rechazar contraseña de 5 caracteres",
      async ({ page }) => {
        await page.goto("/register");

        await page
          .locator('form input[type="text"]')
          .fill("Usuario Limite");

        await page
          .locator('form input[type="email"]')
          .fill(`limite+${Date.now()}@example.com`);

        const password = page.locator(
          'form input[type="password"]'
        );

        await password.pressSequentially("12345");

        await page
          .getByRole("button", {
            name: "Crear cuenta",
          })
          .click();

        await expect(page).toHaveURL(/\/register$/);

        await expect(
          page.getByText("Cuenta creada")
        ).toHaveCount(0);

        const mensaje = await password.evaluate(
          (el) => el.validationMessage
        );

        expect(mensaje).not.toBe("");

        await anotar(page, mensaje);

        await captura(
          page,
          "TC-006_password_5_caracteres"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-007 — CORREO INVÁLIDO
    // ----------------------------------------------------------

    test(
      "TC-007 [RF-005] Rechazar correo inválido",
      async ({ page }) => {
        await page.goto("/register");

        await page
          .locator('form input[type="text"]')
          .fill("Usuario Correo");

        const email = page.locator(
          'form input[type="email"]'
        );

        await email.pressSequentially(
          "correo-sin-arroba"
        );

        await page
          .locator('form input[type="password"]')
          .fill("Abc12345");

        await page
          .getByRole("button", {
            name: "Crear cuenta",
          })
          .click();

        await expect(page).toHaveURL(/\/register$/);

        const mensaje = await email.evaluate(
          (el) => el.validationMessage
        );

        expect(mensaje).not.toBe("");

        await anotar(page, mensaje);

        await captura(
          page,
          "TC-007_correo_invalido"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-002 — LOGIN VÁLIDO
    // ----------------------------------------------------------

    test(
      "TC-002 [RF-002] Login válido",
      async ({ page }) => {
        await page.goto("/login");

        await page
          .getByPlaceholder("nombre@empresa.com")
          .fill(USER_A.email);

        await page
          .locator('input[type="password"]')
          .fill(USER_A.password);

        await captura(
          page,
          "TC-002_a_formulario_login"
        );

        await page
          .getByRole("button", {
            name: "Entrar",
          })
          .click();

        await expect(page).toHaveURL(/\/$/);

        await expect(
          page.getByRole("heading", {
            name: "Catálogo Industrial",
          })
        ).toBeVisible();

        await expect(
          page.locator("h3").first()
        ).toBeVisible();

        await captura(
          page,
          "TC-002_b_catalogo"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-008 — CREDENCIALES INCORRECTAS
    // ----------------------------------------------------------

    test(
      "TC-008 [RF-006] Rechazar credenciales incorrectas",
      async ({ page }) => {
        await page.goto("/login");

        await page
          .getByPlaceholder("nombre@empresa.com")
          .fill(USER_A.email);

        await page
          .locator('input[type="password"]')
          .fill("contraseña-incorrecta-123");

        await page
          .getByRole("button", {
            name: "Entrar",
          })
          .click();

        await expect(
          page.getByText(
            "Credenciales inválidas. Verifica tu correo y contraseña."
          )
        ).toBeVisible();

        await captura(
          page,
          "TC-008_a_password_incorrecta"
        );

        await page.reload();

        await page
          .getByPlaceholder("nombre@empresa.com")
          .fill(
            `no-existe-${Date.now()}@example.com`
          );

        await page
          .locator('input[type="password"]')
          .fill("Abc12345");

        await page
          .getByRole("button", {
            name: "Entrar",
          })
          .click();

        await expect(
          page.getByText(
            "Credenciales inválidas. Verifica tu correo y contraseña."
          )
        ).toBeVisible();

        await captura(
          page,
          "TC-008_b_usuario_inexistente"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-009 — LOGIN CON CAMPOS VACÍOS
    // ----------------------------------------------------------

    test(
      "TC-009 [RF-006] Login con campos vacíos",
      async ({ page }) => {
        await page.goto("/login");

        await page
          .getByRole("button", {
            name: "Entrar",
          })
          .click();

        await expect(page).toHaveURL(/\/login$/);

        const mensaje = await page
          .getByPlaceholder("nombre@empresa.com")
          .evaluate((el) => el.validationMessage);

        expect(mensaje).not.toBe("");

        await anotar(page, mensaje);

        await captura(
          page,
          "TC-009_login_vacio"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-013 — PROTECCIÓN DE RUTAS
    // ----------------------------------------------------------

    test(
      "TC-013 [RF-010] Protección de rutas",
      async ({ page }) => {
        const rutas = [
          "/",
          "/historial",
          "/quote-form",
          "/vincular-movil",
        ];

        for (const ruta of rutas) {
          await page.goto(ruta);

          await expect(page).toHaveURL(/\/login$/);

          const nombre =
            ruta === "/" ? "raiz" : ruta.slice(1);

          await captura(
            page,
            `TC-013_${nombre}`
          );
        }
      }
    );
  });

  // ============================================================
  // COTIZACIONES USUARIO A
  // ============================================================

  test.describe("Cotizaciones usuario A", () => {

    test.beforeEach(async () => {
      await limpiarBorrador(USER_A);
    });

    // ----------------------------------------------------------
    // TC-003 — AGREGAR PRODUCTO Y MODIFICAR CANTIDAD
    // ----------------------------------------------------------

    test(
      "TC-003 [RF-003] Agregar producto y modificar cantidad",
      async ({ page }) => {
        await login(page, USER_A);

        await agregarPrimerProducto(page);

        const lateral = page.locator("aside");

        const cantidad = lateral.locator(
          "li span.font-mono"
        );

        await expect(cantidad).toHaveText("1");

        await captura(
          page,
          "TC-003_a_producto_agregado"
        );

        await lateral
          .getByRole("button", {
            name: "Aumentar cantidad",
          })
          .click();

        await expect(cantidad).toHaveText("2");

        await captura(
          page,
          "TC-003_b_cantidad_2"
        );

        await lateral
          .getByRole("button", {
            name: "Disminuir cantidad",
          })
          .click();

        await expect(cantidad).toHaveText("1");

        await captura(
          page,
          "TC-003_c_cantidad_1"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-016 — ELIMINAR PRODUCTO (CORREGIDA)
    // ----------------------------------------------------------

    test(
      "TC-016 [RF-013] Eliminar producto",
      async ({ page }) => {
        await login(page, USER_A);

        await agregarPrimerProducto(page);

        const lateral = page.locator("aside");
        const filas = lateral.locator("li");

        const cantidadInicial = await filas.count();

        expect(cantidadInicial).toBeGreaterThan(0);

        await captura(
          page,
          "TC-016_a_antes_de_eliminar"
        );

        // Eliminar un producto concreto.
        const primerProducto = filas.first();

        await primerProducto
          .getByRole("button", {
            name: "Quitar producto",
          })
          .click();

        // Verificar que desapareció una fila.
        await expect(filas).toHaveCount(
          cantidadInicial - 1,
          { timeout: 15000 }
        );

        await captura(
          page,
          "TC-016_b_producto_eliminado"
        );

        // Volver a agregar si el carrito está vacío.
        if ((await filas.count()) === 0) {
          await agregarPrimerProducto(page);
        }

        // Probar eliminación al reducir cantidad a cero.
        const fila = filas.first();

        const botonDisminuir = fila.getByRole(
          "button",
          { name: "Disminuir cantidad" }
        );

        const cantidadElemento = fila.locator(
          "span.font-mono"
        );

        const cantidadTexto = (
          await cantidadElemento.innerText()
        ).trim();

        const cantidad = Number(cantidadTexto);

        expect(
          Number.isInteger(cantidad) && cantidad > 0
        ).toBe(true);

        // Reducir hasta que quede una unidad.
        for (
          let actual = cantidad;
          actual > 1;
          actual--
        ) {
          await botonDisminuir.click();

          await expect(cantidadElemento).toHaveText(
            String(actual - 1)
          );
        }

        // Reducir de una unidad a cero.
        const antesDeEliminar = await filas.count();

        await botonDisminuir.click();

        await expect(filas).toHaveCount(
          antesDeEliminar - 1,
          { timeout: 15000 }
        );

        await captura(
          page,
          "TC-016_c_cantidad_cero"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-004 — ENVIAR COTIZACIÓN
    // ----------------------------------------------------------

    test(
      "TC-004 [RF-004] Enviar cotización",
      async ({ page }) => {
        await login(page, USER_A);

        await agregarPrimerProducto(page);

        await page
          .getByRole("link", {
            name: "Proceed to Quote Form",
          })
          .click();

        await expect(
          page.getByRole("heading", {
            name: "Formulario de Cotización",
          })
        ).toBeVisible();

        await captura(
          page,
          "TC-004_a_formulario"
        );

        await llenarFormularioYEnviar(page, {
          nombre: "Usuario Prueba A",
          telefono: "4421234567",
          instrucciones:
            "Entrega en planta (prueba automatizada)",
        });

        await expect(
          page.getByRole("heading", {
            name: "Cotización enviada",
          })
        ).toBeVisible();

        const referencia = (
          await page
            .locator("p.font-mono")
            .first()
            .innerText()
        ).trim();

        expect(referencia).toMatch(/^COT-[\w-]+$/);

        await captura(
          page,
          "TC-004_b_confirmacion_folio"
        );

        await page
          .getByRole("button", {
            name: "Ver historial",
          })
          .click();

        const fila = page.locator("tr", {
          hasText: referencia,
        });

        await expect(fila).toContainText("enviada");

        await captura(
          page,
          "TC-004_c_historial"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-005 — NO ENVIAR COTIZACIÓN VACÍA
    // ----------------------------------------------------------

    test(
      "TC-005 [RF-004] No enviar cotización vacía",
      async ({ page }) => {
        await login(page, USER_A);

        await page.goto("/quote-form");

        await expect(
          page.getByText(
            "No hay productos en tu cotización."
          )
        ).toBeVisible();

        const formulario = page
          .getByRole("main")
          .locator("form");

        await formulario
          .locator('input[type="text"]')
          .fill("Usuario Prueba A");

        await formulario
          .getByRole("button", {
            name: "Submit Quote Request",
          })
          .click();

        await expect(
          page.getByText(
            "Agrega al menos un producto antes de enviar la cotización."
          )
        ).toBeVisible();

        await expect(
          page.getByRole("heading", {
            name: "Cotización enviada",
          })
        ).toHaveCount(0);

        await captura(
          page,
          "TC-005_carrito_vacio"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-011 — PERSISTENCIA DEL BORRADOR
    // ----------------------------------------------------------

    test(
      "TC-011 [RF-008] Persistencia del borrador",
      async ({ page }) => {
        await login(page, USER_A);

        await agregarPrimerProducto(page);

        const lateral = page.locator("aside");

        const nombre = (
          await lateral
            .locator("li p")
            .first()
            .innerText()
        ).trim();

        await captura(
          page,
          "TC-011_a_antes_de_recargar"
        );

        await page.reload();

        await expect(
          lateral.locator("li")
        ).toHaveCount(1);

        await expect(
          lateral.locator("li p").first()
        ).toHaveText(nombre);

        await captura(
          page,
          "TC-011_b_tras_recargar"
        );

        await page
          .getByRole("button", {
            name: "Cerrar sesión",
          })
          .click();

        await expect(page).toHaveURL(/\/login$/);

        await login(page, USER_A);

        await expect(
          lateral.locator("li")
        ).toHaveCount(1);

        await expect(
          lateral.locator("li p").first()
        ).toHaveText(nombre);

        await captura(
          page,
          "TC-011_c_tras_nuevo_login"
        );
      }
    );

    // ----------------------------------------------------------
    // TC-012 — CONSISTENCIA CON BASE DE DATOS
    // ----------------------------------------------------------

    test(
      "TC-012 [RF-009] Consistencia historial y base de datos",
      async ({ page }) => {
        await login(page, USER_A);

        await agregarPrimerProducto(page);

        await page
          .getByRole("link", {
            name: "Proceed to Quote Form",
          })
          .click();

        await llenarFormularioYEnviar(page, {
          nombre: "Usuario Prueba A",
          telefono: "4421234567",
          instrucciones: "Consistencia historial",
        });

        await expect(
          page.getByRole("heading", {
            name: "Cotización enviada",
          })
        ).toBeVisible();

        const referencia = (
          await page
            .locator("p.font-mono")
            .first()
            .innerText()
        ).trim();

        await page
          .getByRole("button", {
            name: "Ver historial",
          })
          .click();

        const fila = page.locator("tr", {
          hasText: referencia,
        });

        await expect(fila).toContainText("enviada");
        await expect(fila).toContainText("Web");

        await captura(
          page,
          "TC-012_a_historial_web"
        );

        const { c, userId } = await apiCliente(USER_A);

        const { data, error } = await c
          .from("quotes")
          .select("referencia,status,enviado_desde")
          .eq("user_id", userId)
          .eq("referencia", referencia);

        if (error) throw error;

        guardarJson(
          "TC-012_b_registro_en_base_de_datos",
          {
            referencia_en_pantalla: referencia,
            registro_api: data,
          }
        );

        expect(data).toHaveLength(1);
        expect(data[0].status).toBe("enviada");
        expect(data[0].enviado_desde).toBe("web");
      }
    );

    // ----------------------------------------------------------
    // TC-017 — PERSISTENCIA DE DATOS DE CONTACTO
    // ----------------------------------------------------------

    test(
      "TC-017 [RF-014] Persistencia de datos de contacto",
      async ({ page }) => {
        const telefono = "4429998877";
        const nombre = "Nombre Persistencia P8";

        await login(page, USER_A);

        await agregarPrimerProducto(page);

        await page
          .getByRole("link", {
            name: "Proceed to Quote Form",
          })
          .click();

        await llenarFormularioYEnviar(page, {
          nombre,
          telefono,
          instrucciones:
            "Prueba de persistencia de contacto",
        });

        await expect(
          page.getByRole("heading", {
            name: "Cotización enviada",
          })
        ).toBeVisible();

        await captura(
          page,
          "TC-017_a_envio"
        );

        const { c, userId } = await apiCliente(USER_A);

        const { data, error } = await c
          .from("profiles")
          .select(
            "nombre_completo,telefono,instrucciones_default"
          )
          .eq("id", userId)
          .single();

        if (error) throw error;

        guardarJson(
          "TC-017_b_perfil_en_base_de_datos",
          {
            enviado: {
              nombre,
              telefono,
            },
            perfil: data,
          }
        );

        await page.reload();
        await page.goto("/quote-form");

        await captura(
          page,
          "TC-017_c_formulario_reabierto"
        );

        expect(data.telefono).toBe(telefono);
      }
    );
  });

  // ============================================================
  // PERMISOS Y AISLAMIENTO
  // ============================================================

  test.describe("Permisos y aislamiento", () => {

    // ----------------------------------------------------------
    // TC-014 — USUARIO B NO ACCEDE A DATOS DE A
    // ----------------------------------------------------------

    test(
      "TC-014 [RF-011] Usuario B no accede a cotizaciones de A",
      async ({ page }) => {
        const a = await apiCliente(USER_A);

        let { data: cotA, error: errorA } = await a.c
          .from("quotes")
          .select(
            "id,referencia,status,enviado_desde"
          )
          .eq("user_id", a.userId)
          .order("created_at", {
            ascending: false,
          });

        if (errorA) throw errorA;

        if (!cotA || cotA.length === 0) {
          const { error: errorCrear } = await a.c
            .from("quotes")
            .insert({
              user_id: a.userId,
              status: "borrador",
              enviado_desde: "web",
            });

          if (errorCrear) throw errorCrear;

          const consulta = await a.c
            .from("quotes")
            .select(
              "id,referencia,status,enviado_desde"
            )
            .eq("user_id", a.userId);

          if (consulta.error) throw consulta.error;

          cotA = consulta.data;
        }

        expect(cotA.length).toBeGreaterThan(0);

        const objetivo = cotA[0];
        const b = await apiCliente(USER_B);

        const lectura = await b.c
          .from("quotes")
          .select("*")
          .eq("id", objetivo.id);

        const lecturaItems = await b.c
          .from("quote_items")
          .select("*")
          .eq("quote_id", objetivo.id);

        const escritura = await b.c
          .from("quotes")
          .update({
            enviado_desde: objetivo.enviado_desde,
          })
          .eq("id", objetivo.id)
          .select();

        const todasDeB = await b.c
          .from("quotes")
          .select("id,user_id");

        guardarJson(
          "TC-014_resultados_api",
          {
            cotizacion_de_A: objetivo.id,

            B_lee_quote_de_A: {
              filas: lectura.data?.length ?? null,
              error: lectura.error?.message ?? null,
            },

            B_lee_items_de_A: {
              filas: lecturaItems.data?.length ?? null,
              error: lecturaItems.error?.message ?? null,
            },

            B_modifica_quote_de_A: {
              filas_afectadas:
                escritura.data?.length ?? null,
              error: escritura.error?.message ?? null,
            },

            B_lista_quotes_ajenas:
              (todasDeB.data || []).filter(
                (q) => q.user_id !== b.userId
              ).length,
          }
        );

        expect(lectura.error).toBeNull();
        expect(lecturaItems.error).toBeNull();
        expect(escritura.error).toBeNull();
        expect(todasDeB.error).toBeNull();

        expect(
          lectura.data ?? []
        ).toHaveLength(0);

        expect(
          lecturaItems.data ?? []
        ).toHaveLength(0);

        expect(
          escritura.data ?? []
        ).toHaveLength(0);

        expect(
          (todasDeB.data || []).filter(
            (q) => q.user_id !== b.userId
          )
        ).toHaveLength(0);

        await login(page, USER_B);

        await page.goto("/historial");

        await expect(
          page.getByRole("heading", {
            name: "Historial de Cotizaciones",
          })
        ).toBeVisible();

        await expect(
          page.getByText("Cargando...")
        ).toHaveCount(0);

        for (const q of cotA.filter(
          (x) => x.referencia
        )) {
          await expect(
            page.getByText(q.referencia)
          ).toHaveCount(0);
        }

        await captura(
          page,
          "TC-014_historial_usuario_B"
        );
      }
    );
  });

  // ============================================================
  // MANEJO DE ERRORES
  // ============================================================

  test.describe("Manejo de errores", () => {

    // ----------------------------------------------------------
    // TC-015 — RESPALDO LOCAL SI FALLA ELASTICSEARCH
    // ----------------------------------------------------------

    test(
      "TC-015 [RF-012] Respaldo local si falla Elasticsearch",
      async ({ page }) => {
        await page.route(
          "**/products/_search",
          (route) => route.abort("connectionrefused")
        );

        await login(page, USER_A);

        const primero = (
          await page
            .locator("h3")
            .first()
            .innerText()
        ).trim();

        const termino =
          primero
            .split(/\s+/)
            .find((p) => p.length >= 4) || primero;

        await page
          .getByPlaceholder(
            /Buscar productos, categorías/
          )
          .fill(termino);

        await expect(
          page.getByText(/búsqueda local/)
        ).toBeVisible({
          timeout: 8000,
        });

        expect(
          await page.locator("h3").count()
        ).toBeGreaterThan(0);

        await anotar(
          page,
          `Elasticsearch bloqueado. Término: ${termino}`
        );

        await captura(
          page,
          "TC-015_respaldo_busqueda_local"
        );
      }
    );
  });

  // ============================================================
  // FIN — 16 PRUEBAS PLAYWRIGHT
  // ============================================================
