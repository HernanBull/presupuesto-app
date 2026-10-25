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
        <rect x="43" y="50" width="24" height="28" rx="5" fill="#EA580C" stroke="#C2410C" strokeWidth="1.5" />
        {/* Franja reflectante de la mochila */}
        <rect x="43" y="73" width="24" height="3" fill="#FDE047" />

        {/* Logo oficial de la Cajita AxonMarket en la mochila */}
        <image
          href="/axonmarket-logo-icon.png"
          x="46"
          y="53"
          width="18"
          height="18"
          preserveAspectRatio="xMidYMid meet"
        />

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
 * - Logo oficial de la cajita AxonMarket en el letrero
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

        {/* Letrero / Emblema superior con la cajita oficial AxonMarket */}
        <image
          href="/axonmarket-logo-icon.png"
          x="71"
          y="18"
          width="18"
          height="18"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Suelo / Acera */}
        <line x1="26" y1="116" x2="134" y2="116" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/**
 * Ilustración 3: Teléfono Móvil con App AxonMarket
 * - Smartphone vertical elegante estilo DoorDash
 * - Pantalla con el logotipo oficial de la cajita anaranjada AxonMarket
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
        <rect x="56" y="22" width="48" height="92" rx="9" fill="#0F172A" />

        {/* Pantalla del Teléfono */}
        <rect x="59" y="25" width="42" height="86" rx="6" fill="#FFFFFF" />

        {/* Cámara frontal / Altavoz */}
        <circle cx="80" cy="29" r="1.5" fill="#334155" />

        {/* Logo Oficial de la Cajita AxonMarket en el centro de la pantalla (1:1 DoorDash) */}
        <image
          href="/axonmarket-logo-icon.png"
          x="65"
          y="46"
          width="30"
          height="30"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Tipografía de la marca bajo el icono */}
        <text
          x="80"
          y="85"
          textAnchor="middle"
          fill="#0F172A"
          fontSize="5"
          fontWeight="900"
          letterSpacing="0.8"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
        >
          AXON<tspan fill="#F59E0B">MARKET</tspan>
        </text>

        {/* Barra de inicio inferior (Home indicator) */}
        <rect x="72" y="104" width="16" height="2" rx="1" fill="#CBD5E1" />
      </svg>
    </div>
  );
}
