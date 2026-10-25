import React from 'react';

/**
 * Ilustración 1: Repartidor AxonMarket (Dasher style)
 * - Hombre en scooter/moto naranja
 * - Casco y mochila térmica con el logo de la cajita AxonMarket
 * - Fondo orgánico suave
 */
export function DeliveryRiderIllustration({ className = "w-32 h-28" }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Fondo orgánico suave tipo nube / blob DoorDash */}
        <path
          d="M38 42C22 55 12 78 22 102C32 126 62 135 92 132C122 129 148 112 152 86C156 60 138 32 114 22C90 12 54 29 38 42Z"
          fill="#E6F4F8"
        />

        {/* --- MOTO / SCOOTER --- */}
        {/* Rueda trasera */}
        <circle cx="48" cy="108" r="16" fill="#1E293B" />
        <circle cx="48" cy="108" r="9" fill="#94A3B8" />
        <circle cx="48" cy="108" r="4" fill="#E2E8F0" />

        {/* Rueda delantera */}
        <circle cx="122" cy="108" r="16" fill="#1E293B" />
        <circle cx="122" cy="108" r="9" fill="#94A3B8" />
        <circle cx="122" cy="108" r="4" fill="#E2E8F0" />

        {/* Chasis y Guardabarros Trasero */}
        <path d="M42 98C42 92 48 88 56 88L70 88L74 98L44 98" fill="#EA580C" />
        {/* Plataforma baja */}
        <path d="M60 102L96 102L98 94L64 94Z" fill="#334155" />

        {/* Carrocería frontal de la moto (naranja Axon) */}
        <path
          d="M90 94L104 68C106 64 110 62 115 63L118 64C122 66 125 70 124 75L118 102L106 102Z"
          fill="#F97316"
        />
        {/* Faro delantero */}
        <path d="M120 72L127 74L125 80L118 78Z" fill="#FEF08A" />
        {/* Manillar / Volante */}
        <path d="M106 63L102 52L96 52" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="95" cy="52" r="2.5" fill="#0F172A" />

        {/* --- REPARTIDOR (Hombre) --- */}
        {/* Piernas / Pantalón oscuro */}
        <path
          d="M68 84L82 86L86 100L78 100L74 90L66 88Z"
          fill="#1E293B"
        />
        {/* Zapato */}
        <path d="M84 98L92 98C94 98 96 100 95 102L84 102Z" fill="#0F172A" />

        {/* Cuerpo / Chaqueta */}
        <path
          d="M62 58L76 56C82 56 86 60 86 66L84 84L68 84L62 70Z"
          fill="#0284C7"
        />
        {/* Brazo extendido hacia el manillar */}
        <path
          d="M74 62L96 56L98 62L78 70Z"
          fill="#0369A1"
        />
        {/* Mano con guante */}
        <circle cx="97" cy="55" r="3" fill="#1E293B" />

        {/* Cabeza y Cuello */}
        <path d="M76 48L78 54L83 54L81 48Z" fill="#FDBA74" />
        {/* Rostro masculino de perfil */}
        <circle cx="82" cy="44" r="8" fill="#FDBA74" />
        {/* Cabello corto castaño */}
        <path d="M78 40C78 36 84 36 86 40L88 42L82 43Z" fill="#451A03" />

        {/* Casco aerodinámico con visera */}
        <path
          d="M74 42C74 34 80 30 89 31C96 32 99 37 99 43C99 45 97 47 94 47L80 47C76 47 74 45 74 42Z"
          fill="#EA580C"
        />
        {/* Visera del casco */}
        <path d="M91 38L98 40L96 44L90 43Z" fill="#0F172A" />

        {/* --- MOCHILA TÉRMICA DELIVERY (Con la cajita AxonMarket) --- */}
        <rect x="44" y="52" width="22" height="26" rx="4" fill="#EA580C" stroke="#C2410C" strokeWidth="1.5" />
        {/* Franja reflectante de la mochila */}
        <rect x="44" y="72" width="22" height="3" fill="#FDE047" />

        {/* Icono de la Cajita AxonMarket en la mochila */}
        <g transform="translate(49, 56) scale(0.55)">
          <path
            d="M5 9L3 21H19L17 9H5Z"
            fill="#FFFFFF"
          />
          <path
            d="M8 9V6C8 4.34315 9.34315 3 11 3C12.6569 3 14 4.34315 14 6V9"
            stroke="#EA580C"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Línea de velocidad sutil */}
        <path d="M24 108L30 108M18 112L26 112" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Ilustración 2: Tienda Comercial AxonMarket
 * - Fachada de tienda con vitrina luminosa
 * - Toldo a rayas naranja y blanco crema
 * - Logo de la cajita AxonMarket en el letrero
 * - Fondo orgánico suave
 */
export function MerchantStoreIllustration({ className = "w-32 h-28" }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Fondo orgánico suave DoorDash */}
        <path
          d="M32 40C20 62 18 90 32 110C46 130 76 135 106 130C136 125 152 102 148 76C144 50 128 26 102 18C76 10 44 18 32 40Z"
          fill="#E6F4F8"
        />

        {/* Estructura del edificio / Tienda */}
        <rect x="36" y="56" width="88" height="60" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />

        {/* Puerta de entrada con marco naranja */}
        <rect x="46" y="74" width="22" height="42" rx="2" fill="#F8FAFC" stroke="#EA580C" strokeWidth="2" />
        {/* Vidrio de la puerta */}
        <rect x="50" y="78" width="14" height="24" rx="1" fill="#BAE6FD" opacity="0.6" />
        {/* Pomo de la puerta */}
        <circle cx="64" cy="96" r="2" fill="#EA580C" />

        {/* Gran Ventanal de Exhibición */}
        <rect x="76" y="74" width="40" height="32" rx="2" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="79" y="77" width="34" height="26" fill="#FEF3C7" opacity="0.6" />
        {/* Productos en vitrina */}
        <circle cx="88" cy="94" r="5" fill="#F97316" />
        <rect x="98" y="89" width="10" height="10" rx="2" fill="#10B981" />

        {/* --- TOLDO / MARQUESINA A RAYAS NARANJA Y BLANCO --- */}
        <g>
          {/* Base del toldo */}
          <path
            d="M30 54L34 38L126 38L130 54Z"
            fill="#EA580C"
          />
          {/* Franjas blancas */}
          <path d="M46 38L44 54L56 54L58 38Z" fill="#FFFFFF" />
          <path d="M70 38L68 54L80 54L82 38Z" fill="#FFFFFF" />
          <path d="M94 38L92 54L104 54L106 38Z" fill="#FFFFFF" />
          <path d="M118 38L116 54L128 54L130 38Z" fill="#FFFFFF" />

          {/* Cenefa ondulada inferior del toldo */}
          <path
            d="M30 54C33 58 37 58 40 54C43 58 47 58 50 54C53 58 57 58 60 54C63 58 67 58 70 54C73 58 77 58 80 54C83 58 87 58 90 54C93 58 97 58 100 54C103 58 107 58 110 54C113 58 117 58 120 54C123 58 127 58 130 54L130 51L30 51Z"
            fill="#EA580C"
          />
        </g>

        {/* Letrero / Emblema superior con la cajita AxonMarket */}
        <g transform="translate(73, 24)">
          <rect x="-1" y="0" width="16" height="14" rx="3" fill="#EA580C" />
          {/* Cajita blanca */}
          <path d="M3 5L2 12H12L11 5H3Z" fill="#FFFFFF" />
          <path d="M5 5V3.5C5 2.67 5.67 2 6.5 2H7.5C8.33 2 9 2.67 9 3.5V5" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Suelo / Acera */}
        <line x1="26" y1="116" x2="134" y2="116" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Ilustración 3: Teléfono Móvil con App AxonMarket
 * - Smartphone vertical elegante
 * - Pantalla luminosa con el logo de la cajita AxonMarket y botón
 * - Fondo orgánico suave
 */
export function MobileAppIllustration({ className = "w-32 h-28" }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 160 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Fondo orgánico suave DoorDash */}
        <path
          d="M38 36C22 56 16 86 28 108C40 130 72 136 104 130C136 124 150 98 146 72C142 46 124 22 98 16C72 10 54 16 38 36Z"
          fill="#E6F4F8"
        />

        {/* Sombra del teléfono */}
        <ellipse cx="80" cy="118" rx="24" ry="5" fill="#94A3B8" opacity="0.3" />

        {/* Cuerpo del Smartphone (Carcasa oscura refinada) */}
        <rect x="58" y="24" width="44" height="88" rx="8" fill="#0F172A" />

        {/* Pantalla del Teléfono */}
        <rect x="61" y="28" width="38" height="80" rx="5" fill="#FFFFFF" />

        {/* Cámara frontal / Notch */}
        <circle cx="80" cy="32" r="1.5" fill="#334155" />

        {/* Interfaz de la app AxonMarket */}
        {/* Barra superior de app */}
        <rect x="64" y="36" width="32" height="4" rx="2" fill="#F1F5F9" />

        {/* Tarjeta central naranja con la Cajita AxonMarket */}
        <rect x="66" y="46" width="28" height="28" rx="6" fill="#FFF7ED" stroke="#FDBA74" strokeWidth="1" />
        
        {/* Icono de la Cajita AxonMarket en el centro */}
        <g transform="translate(73, 51)">
          {/* Contenedor naranja de la cajita */}
          <rect x="0" y="0" width="14" height="14" rx="3.5" fill="#EA580C" />
          {/* Bolsa interior */}
          <path d="M3 5.5L2.2 11.5H11.8L11 5.5H3Z" fill="#FFFFFF" />
          <path d="M4.5 5.5V4C4.5 3.17 5.17 2.5 6 2.5H8C8.83 2.5 9.5 3.17 9.5 4V5.5" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Nombre AXONMARKET en pantalla */}
        <rect x="68" y="67" width="24" height="3" rx="1.5" fill="#EA580C" />

        {/* Elementos UI simulados (feed de tiendas y botón de acción) */}
        <rect x="66" y="80" width="28" height="4" rx="2" fill="#E2E8F0" />
        <rect x="66" y="87" width="28" height="6" rx="3" fill="#EA580C" />
        <rect x="74" y="89" width="12" height="2" rx="1" fill="#FFFFFF" />

        {/* Barra de inicio inferior (Home indicator) */}
        <rect x="73" y="102" width="14" height="2" rx="1" fill="#94A3B8" />
      </svg>
    </div>
  );
}
