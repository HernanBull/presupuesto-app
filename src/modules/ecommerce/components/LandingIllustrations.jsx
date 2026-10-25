import React from 'react';

/**
 * Ilustración 1: Repartidor AxonMarket (Generada con la identidad de marca)
 * - Hombre en scooter naranja con casco y mochila delivery exhibiendo la cajita AxonMarket
 * - Fondo orgánico suave
 */
export function DeliveryRiderIllustration({ className = "w-36 h-32" }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <img
        src="/axonmarket-rider.png"
        alt="Repartidor AxonMarket"
        className="w-full h-full object-contain select-none drop-shadow-xs"
      />
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

        {/* Logo Oficial de la Cajita AxonMarket centrado en la pantalla (1:1 DoorDash) */}
        <image
          href="/axonmarket-logo-icon.png"
          x="64"
          y="52"
          width="32"
          height="32"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Barra de inicio inferior (Home indicator) */}
        <rect x="72" y="104" width="16" height="2" rx="1" fill="#CBD5E1" />
      </svg>
    </div>
  );
}
