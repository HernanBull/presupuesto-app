# Plan de Implementación: Secciones Destacadas Estilo DoorDash para AxonMarket

Este plan detalla la integración de los **3 bloques editoriales y comerciales de DoorDash** en la página principal (`WelcomeLanding.jsx`), adaptados al ecosistema y marca de **AxonMarket** (incluyendo el nuevo programa de beneficios **AxonPass**).

---

## 1. Desglose de los 3 Bloques Comerciales

| Bloque | Titular Adaptado | Propuesta de Valor y Contenido | Botón de Acción (CTA) | Contenedor Visual (Temporal) |
| :--- | :--- | :--- | :--- | :--- |
| **Bloque 1: Gastronomía Local** | **Todo lo que se te antoja, entregado a domicilio.** | *Tus restaurantes locales favoritos.* Pide tus hamburguesas, pizzas, sushi o comida casera favorita de los mejores restaurantes de tu ciudad, directo a tu mesa. | `Buscar restaurantes` (Lleva a `/explorar?cat=Comida`) | Banner gráfico cálido con degradado gastronómico e iconos de platos favoritos |
| **Bloque 2: Fidelidad y Ahorro** | **AxonPass es entregas con mayor ahorro y beneficios.** | *Ahorra en cada pedido.* Entregas preferenciales en comercios afiliados a AxonPass, descuentos exclusivos en pick-up y promociones VIP. Disfrútalo gratis durante tus primeros 30 días. | `Obtener AxonPass` (Lleva al modal de suscripción/beneficios) | Banner premium dorado/ámbar con tarjeta VIP simulada de AxonPass |
| **Bloque 3: Bodegones y Farmacias** | **Tiendas de conveniencia y víveres a la puerta de tu casa.** | *Abastece tu despensa sin salir.* Snacks, artículos básicos para el hogar, víveres importados o farmacia; todo entregado en tiempo récord. | `Comprar ahora` (Lleva a `/explorar?cat=Víveres`) | Banner fresco esmeralda/naranja con bolsa de compras y productos esenciales |

---

## 2. Arquitectura Visual y Responsive (Layout 1:1 DoorDash)

- **Fondo de Sección**: Tono crema cálido muy sutil (`#FAF7F5` / `#FCF9F6`), idéntico al contraste que utiliza DoorDash entre secciones blancas.
- **Distribución en Escritorio (Desktop)**:
  - Diseño alternado (*zigzag*):
    - **Fila 1 (Restaurantes)**: Banner visual a la izquierda | Texto y botón a la derecha.
    - **Fila 2 (AxonPass)**: Texto y botón a la izquierda | Banner visual a la derecha.
    - **Fila 3 (Conveniencia)**: Banner visual a la izquierda | Texto y botón a la derecha.
- **Distribución en Móvil (Mobile)**:
  - Tarjetas apiladas verticalmente con el banner visual arriba y el texto con botón cápsula rojo/naranja abajo (`#EA580C` / `#EB1700`).

---

## 3. Estrategia de Contenedores Visuales Provisionales

Siguiendo la indicación del usuario:
> *"Las imágenes lógicamente no las vamos a colocar, vamos a colocar cualquier icono que tú puedas colocar ahí, más adelante vamos a colocar una imagen."*

Diseñaremos **Banners Gráficos Ilustrados y Reutilizables**:
1. Altura fija moderna (`h-56 sm:h-72`) con esquinas redondeadas (`rounded-3xl`).
2. Fondos con degradados temáticos suaves y elegantes:
   - **Gastronomía**: Tonos terracota y ámbar cálido con iconos de platos y cubiertos.
   - **AxonPass**: Tonos oro metálico, carbón y destellos dorados con la insignia VIP de AxonMarket.
   - **Conveniencia**: Tonos menta fresca y naranja con iconos de compras del hogar.
3. Preparados con la propiedad `src` lista para que, en cuanto se tengan las fotografías oficiales de alta definición, se sustituyan con un solo enlace sin alterar el maquetado.

---

## 4. Fases de Ejecución

1. **Fase 1**: Crear los 3 bloques en `WelcomeLanding.jsx`.
2. **Fase 2**: Implementar el diseño tipográfico DoorDash (titulares en negrita tamaño display, subtítulos informativos y botones cápsula con microinteracción hover).
3. **Fase 3**: Validar compilación (`npm run build`) y verificar que no existan conflictos de estilos CSS globales.
4. **Fase 4**: Despliegue a GitHub (`main`) y verificación en el navegador en vivo.
