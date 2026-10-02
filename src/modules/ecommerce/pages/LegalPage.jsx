import React, { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Cookie, Store, Info, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const LEGAL_CONTENT = {
  terminos: {
    icon: <FileText size={28} />,
    title: 'Términos y Condiciones de Uso',
    lastUpdated: 'Octubre 2026',
    sections: [
      {
        heading: '1. Identificación de las Partes y Objeto',
        content: `AxonMarket (en adelante, "la Plataforma") es un servicio de intermediación tecnológica operado en la República Bolivariana de Venezuela, que facilita el encuentro entre comerciantes independientes (en adelante, "Comerciantes") y consumidores finales (en adelante, "Compradores").\n\nAxonMarket actúa exclusivamente como intermediario tecnológico y NO es vendedor, fabricante, ni distribuidor de ningún producto o servicio ofertado por los Comerciantes. Cada transacción se realiza directamente entre el Comprador y el Comerciante correspondiente.`
      },
      {
        heading: '2. Aceptación de los Términos',
        content: `Al acceder, navegar o registrarse en AxonMarket, el usuario (Comprador o Comerciante) declara haber leído, comprendido y aceptado íntegramente los presentes Términos y Condiciones, así como la Política de Privacidad y demás documentos legales de la Plataforma.\n\nSi el usuario no está de acuerdo con alguna de las disposiciones aquí contenidas, deberá abstenerse de utilizar la Plataforma.`
      },
      {
        heading: '3. Registro y Cuenta de Usuario',
        content: `Para acceder a las funcionalidades completas de AxonMarket, el usuario deberá crear una cuenta proporcionando información veraz, actualizada y completa. El usuario es el único responsable de la confidencialidad de sus credenciales de acceso y de todas las actividades que se realicen bajo su cuenta.\n\nAxonMarket se reserva el derecho de suspender o cancelar cuentas que proporcionen información falsa o que incumplan estos Términos.`
      },
      {
        heading: '4. Conducta del Usuario y Prohibiciones',
        content: `El usuario se compromete a utilizar la Plataforma de conformidad con la ley venezolana y las buenas costumbres. Queda expresamente prohibido:\n\n• Proporcionar datos personales falsos o de terceros sin su consentimiento.\n• Realizar fraudes, estafas o cualquier actividad ilícita a través de la Plataforma.\n• Publicar contenido difamatorio, obsceno, violento o que viole derechos de terceros.\n• Usar la Plataforma para actividades no autorizadas por las leyes de la República Bolivariana de Venezuela.\n• Realizar ingeniería inversa, copiar o reproducir el software de la Plataforma.`
      },
      {
        heading: '5. Responsabilidad de AxonMarket como Intermediario',
        content: `AxonMarket no garantiza la calidad, exactitud, legalidad, seguridad ni disponibilidad de los productos y servicios ofrecidos por los Comerciantes. La Plataforma no es parte de las transacciones entre Compradores y Comerciantes.\n\nAxonMarket no será responsable por daños directos, indirectos, incidentales o consecuentes derivados del uso de la Plataforma o de las transacciones realizadas entre Compradores y Comerciantes. Esta limitación aplica en la máxima extensión permitida por la legislación venezolana vigente.`
      },
      {
        heading: '6. Propiedad Intelectual',
        content: `Todos los derechos de propiedad intelectual sobre la Plataforma, incluyendo su diseño, código fuente, marcas, logotipos y contenidos propios, son de titularidad exclusiva de AxonMarket o sus licenciantes. Queda prohibida su reproducción, distribución o uso sin autorización expresa y por escrito.`
      },
      {
        heading: '7. Modificaciones de los Términos',
        content: `AxonMarket se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones entrarán en vigor desde su publicación en la Plataforma. El uso continuado de la Plataforma tras la publicación de cambios implica la aceptación de los mismos.`
      },
      {
        heading: '8. Ley Aplicable y Jurisdicción',
        content: `Los presentes Términos se rigen por las leyes de la República Bolivariana de Venezuela, en particular por el Decreto con Fuerza de Ley sobre Mensajes de Datos y Firmas Electrónicas (2001), el Código de Comercio venezolano y la Ley para la Defensa de las Personas en el Acceso a los Bienes y Servicios (LPPDPCSF).\n\nCualquier controversia derivada de estos Términos será sometida a los tribunales competentes de la República Bolivariana de Venezuela.`
      },
      {
        heading: '9. Contacto',
        content: `Para cualquier consulta relacionada con estos Términos, puede contactarnos a través de los canales oficiales de soporte disponibles en la Plataforma.`
      }
    ]
  },
  privacidad: {
    icon: <Shield size={28} />,
    title: 'Política de Privacidad',
    lastUpdated: 'Octubre 2026',
    sections: [
      {
        heading: '1. Responsable del Tratamiento de Datos',
        content: `AxonMarket, operado en la República Bolivariana de Venezuela, es el responsable del tratamiento de los datos personales recabados a través de la Plataforma, en cumplimiento del Artículo 60 de la Constitución de la República Bolivariana de Venezuela (CRBV) que garantiza el derecho a la protección del honor, vida privada, intimidad, propia imagen, confidencialidad y reputación.`
      },
      {
        heading: '2. Datos Personales que Recopilamos',
        content: `AxonMarket recopila los siguientes datos personales:\n\n• Datos de identificación: nombre completo, número de cédula o documento de identidad.\n• Datos de contacto: correo electrónico, número de teléfono, dirección de entrega.\n• Datos de la cuenta: contraseña (cifrada), foto de perfil (subida voluntariamente).\n• Datos de uso: historial de pedidos, tiendas visitadas, preferencias de compra.\n• Datos técnicos: dirección IP, tipo de navegador, datos de sesión de autenticación.\n\nNingún dato de tarjeta de crédito o débito es almacenado en nuestros servidores.`
      },
      {
        heading: '3. Finalidad del Tratamiento de Datos',
        content: `Sus datos personales son utilizados exclusivamente para:\n\n• Gestionar su cuenta y proveer los servicios de la Plataforma.\n• Procesar y gestionar sus pedidos.\n• Comunicar actualizaciones, alertas de pedidos y notificaciones relevantes.\n• Mejorar la experiencia del usuario y los servicios de la Plataforma.\n• Cumplir con obligaciones legales y reglamentarias.\n• Prevenir fraudes y actividades ilícitas.`
      },
      {
        heading: '4. Base Legal del Tratamiento',
        content: `El tratamiento de sus datos se realiza bajo las siguientes bases legales:\n\n• Ejecución de un contrato: para la prestación de los servicios de la Plataforma.\n• Consentimiento: cuando usted acepta estos términos al registrarse.\n• Cumplimiento de obligaciones legales: según la normativa venezolana vigente.`
      },
      {
        heading: '5. Compartición de Datos con Terceros',
        content: `AxonMarket puede compartir sus datos personales con:\n\n• Comerciantes de la Plataforma: únicamente los datos necesarios para procesar su pedido (nombre, dirección de entrega, teléfono de contacto).\n• Proveedores de servicios tecnológicos: como Supabase (base de datos segura) y servicios de autenticación, bajo acuerdos de confidencialidad estrictos.\n\nAxonMarket NO vende, alquila ni comercializa sus datos personales a terceros con fines publicitarios.`
      },
      {
        heading: '6. Derechos del Usuario sobre sus Datos',
        content: `En cumplimiento del Artículo 60 de la CRBV, usted tiene derecho a:\n\n• Acceso: solicitar información sobre los datos que poseemos sobre usted.\n• Rectificación: corregir datos incorrectos o desactualizados.\n• Eliminación: solicitar la eliminación de su cuenta y datos personales.\n• Portabilidad: solicitar una copia de sus datos en formato utilizable.\n\nPara ejercer estos derechos, puede contactarnos a través de los canales de soporte de la Plataforma.`
      },
      {
        heading: '7. Seguridad de los Datos',
        content: `AxonMarket implementa medidas técnicas y organizativas apropiadas para proteger sus datos personales contra accesos no autorizados, pérdida, destrucción o alteración. Las contraseñas se almacenan con cifrado seguro y las comunicaciones se realizan a través de protocolos HTTPS.`
      },
      {
        heading: '8. Retención de Datos',
        content: `Sus datos personales serán conservados durante el tiempo que mantenga una cuenta activa en la Plataforma y durante el período adicional necesario para cumplir con obligaciones legales. Tras la eliminación de su cuenta, sus datos serán eliminados o anonimizados en un plazo máximo de 30 días, salvo que la ley venezolana exija su conservación por un período mayor.`
      },
      {
        heading: '9. Cambios a esta Política',
        content: `AxonMarket puede actualizar esta Política de Privacidad periódicamente. Le notificaremos cualquier cambio significativo a través de la Plataforma. Le recomendamos revisar esta política regularmente.`
      }
    ]
  },
  cookies: {
    icon: <Cookie size={28} />,
    title: 'Política de Cookies y Almacenamiento Local',
    lastUpdated: 'Octubre 2026',
    sections: [
      {
        heading: '1. ¿Qué son las Cookies y el Almacenamiento Local?',
        content: `Las cookies son pequeños archivos de texto que los sitios web almacenan en el dispositivo del usuario. AxonMarket, siendo una Aplicación Web Progresiva (PWA), utiliza principalmente el almacenamiento local del navegador (localStorage y sessionStorage) en lugar de cookies tradicionales, para garantizar una experiencia fluida y segura.`
      },
      {
        heading: '2. Datos que Almacenamos en su Dispositivo',
        content: `AxonMarket almacena la siguiente información en su dispositivo:\n\n• Sesión de autenticación de Supabase: datos cifrados de su sesión activa (necesario para mantenerlo conectado).\n• ecommerce_current_customer: información básica de su perfil de cliente para evitar cargarlo repetidamente del servidor.\n• activeWorkspace / storeSlug: identificador de la tienda activa (solo para Comerciantes).\n• axon_pwa_banner_dismissed_until: fecha hasta la que no se mostrará el banner de instalación de la app.\n• Carrito de compras temporal: los productos que ha seleccionado se guardan localmente para preservar su selección.`
      },
      {
        heading: '3. Clasificación por Tipo y Propósito',
        content: `Estrictamente Necesarios: datos de sesión de autenticación. Sin ellos, no puede iniciar sesión ni mantenerse conectado. No pueden desactivarse.\n\nFuncionales: carrito de compras, preferencias de visualización. Permiten personalizar su experiencia. Pueden limpiarse borrando el historial del navegador.\n\nPreferencias de UX: configuración de banners y notificaciones. Mejoran su experiencia evitando mensajes repetitivos.`
      },
      {
        heading: '4. Servicios de Terceros',
        content: `AxonMarket puede integrar servicios de terceros que establecen sus propias cookies:\n\n• Google (autenticación con Google): gestiona el proceso de inicio de sesión con su cuenta Google. Consulte la Política de Privacidad de Google.\n• Supabase: plataforma de base de datos que gestiona tokens de autenticación seguros.`
      },
      {
        heading: '5. Control de sus Datos de Almacenamiento',
        content: `Puede gestionar o eliminar los datos almacenados en su dispositivo en cualquier momento:\n\n• En Chrome/Edge: Configuración → Privacidad y seguridad → Cookies y otros datos de sitios.\n• En Safari: Configuración → Safari → Avanzado → Datos de sitios web.\n• En Firefox: Opciones → Privacidad y Seguridad → Cookies y datos del sitio.\n\nTenga en cuenta que eliminar estos datos puede cerrar su sesión y restablecer sus preferencias.`
      },
      {
        heading: '6. Actualizaciones de esta Política',
        content: `Esta política puede actualizarse para reflejar cambios en nuestra tecnología o prácticas. Le notificaremos cambios significativos a través de la Plataforma.`
      }
    ]
  },
  comerciantes: {
    icon: <Store size={28} />,
    title: 'Términos y Condiciones para Comerciantes',
    lastUpdated: 'Octubre 2026',
    sections: [
      {
        heading: '1. Definición y Aceptación',
        content: `Los presentes Términos para Comerciantes (en adelante, "Acuerdo de Comerciante") rigen la relación entre AxonMarket y toda persona natural o jurídica que utilice la Plataforma para ofrecer productos o servicios (en adelante, "Comerciante").\n\nAl completar el proceso de registro de tienda y hacer clic en "Acepto los Términos", el Comerciante declara haber leído, comprendido y aceptado íntegramente este Acuerdo.`
      },
      {
        heading: '2. Naturaleza del Servicio de AxonMarket',
        content: `AxonMarket provee al Comerciante una infraestructura tecnológica (tienda virtual, gestión de pedidos, inventario, herramientas de análisis) para que pueda ofrecer sus productos y servicios a los Compradores.\n\nAxonMarket actúa exclusivamente como proveedor de tecnología e intermediario. NO es socio, empleador ni agente del Comerciante. La relación comercial es exclusivamente entre el Comerciante y sus Compradores.`
      },
      {
        heading: '3. Responsabilidades del Comerciante',
        content: `El Comerciante asume plena y exclusiva responsabilidad por:\n\n• La veracidad, exactitud y legalidad de la información de sus productos (descripción, precios, imágenes, disponibilidad).\n• El cumplimiento de sus pedidos, incluyendo la entrega en tiempo y forma.\n• La calidad y seguridad de los productos que ofrece.\n• El trato digno y respetuoso hacia los Compradores.\n• El cumplimiento de todas las leyes venezolanas aplicables a su actividad comercial, incluyendo la Ley de Precios Justos y normativas tributarias vigentes.\n• La gestión de devoluciones, cambios y reclamos de sus clientes.`
      },
      {
        heading: '4. Precios y Cumplimiento de la Ley de Precios Justos',
        content: `El Comerciante es el único responsable de fijar los precios de sus productos en cumplimiento estricto con la Ley Orgánica de Precios Justos de Venezuela y las resoluciones emitidas por la Superintendencia Nacional para la Defensa de los Derechos Socioeconómicos (SUNDDE).\n\nAxonMarket no se responsabiliza por sanciones, multas o consecuencias legales derivadas del incumplimiento del Comerciante con la normativa de precios vigente.`
      },
      {
        heading: '5. Uso Aceptable de la Plataforma',
        content: `El Comerciante se compromete a NO:\n\n• Publicar productos ilegales, falsificados, peligrosos o que violen derechos de propiedad intelectual.\n• Proporcionar información falsa sobre su identidad, ubicación o los productos que ofrece.\n• Manipular reseñas o calificaciones de forma fraudulenta.\n• Contactar a Compradores fuera de la Plataforma para evadir comisiones o acuerdos establecidos.\n• Realizar cualquier actividad que dañe la reputación o funcionamiento de AxonMarket.`
      },
      {
        heading: '6. Tarifas y Plan de Suscripción',
        content: `El acceso a la infraestructura de AxonMarket puede estar sujeto a planes de suscripción con tarifas mensuales. Los detalles específicos de precios se encuentran disponibles en la página de Precios de la Plataforma.\n\nAxonMarket se reserva el derecho de modificar sus tarifas, notificando al Comerciante con al menos 30 días de anticipación.`
      },
      {
        heading: '7. Suspensión y Terminación de Cuenta',
        content: `AxonMarket se reserva el derecho de suspender o eliminar la cuenta de un Comerciante, con o sin previo aviso, en los siguientes casos:\n\n• Violación de cualquier disposición de este Acuerdo o de los Términos generales.\n• Quejas reiteradas de Compradores no resueltas.\n• Actividades fraudulentas o ilegales.\n• Incumplimiento de pago del plan de suscripción (cuando aplique).\n• Por requerimiento de autoridad competente venezolana.\n\nEn caso de suspensión justificada, AxonMarket no será responsable por daños económicos o pérdidas del Comerciante.`
      },
      {
        heading: '8. Propiedad de los Datos de la Tienda',
        content: `Los datos de productos, inventario y configuración ingresados por el Comerciante son de su propiedad. AxonMarket los almacena para la prestación del servicio. Ante la eliminación de la cuenta, el Comerciante puede solicitar la exportación de sus datos antes de la baja definitiva.`
      },
      {
        heading: '9. Ley Aplicable',
        content: `Este Acuerdo de Comerciante se rige por las leyes de la República Bolivariana de Venezuela. Cualquier controversia será sometida a los tribunales competentes venezolanos.`
      }
    ]
  },
  aviso: {
    icon: <Info size={28} />,
    title: 'Aviso Legal',
    lastUpdated: 'Octubre 2026',
    sections: [
      {
        heading: '1. Operador de la Plataforma',
        content: `AxonMarket es una plataforma de intermediación tecnológica para comercio electrónico, operada en la República Bolivariana de Venezuela.\n\nPaís de operación: República Bolivariana de Venezuela\nContacto: Disponible a través de los canales de soporte de la Plataforma.`
      },
      {
        heading: '2. Actividad y Naturaleza',
        content: `AxonMarket es un Mercado Digital Multiinquilino (Multi-tenant Digital Marketplace). Su actividad principal consiste en la provisión de infraestructura tecnológica para que comerciantes independientes puedan ofrecer sus productos y servicios a consumidores finales a través de internet.\n\nAxonMarket NO es una tienda virtual propia. No compra, vende, importa ni exporta ningún producto o servicio. Es exclusivamente un intermediario tecnológico.`
      },
      {
        heading: '3. Marco Normativo Aplicable',
        content: `La Plataforma opera bajo el marco legal de la República Bolivariana de Venezuela, incluyendo:\n\n• Constitución de la República Bolivariana de Venezuela (CRBV), especialmente el Artículo 60.\n• Decreto con Fuerza de Ley sobre Mensajes de Datos y Firmas Electrónicas (2001).\n• Ley para la Defensa de las Personas en el Acceso a los Bienes y Servicios (LPPDPCSF).\n• Ley Orgánica de Precios Justos.\n• Código de Comercio de Venezuela.\n• Ley de Infogobierno (2013).`
      },
      {
        heading: '4. Propiedad Intelectual',
        content: `La marca "AxonMarket", el logotipo, el diseño de la interfaz y todo el contenido propio de la Plataforma son propiedad intelectual de sus titulares. Queda prohibida su reproducción total o parcial sin autorización expresa y por escrito.\n\nEl software que soporta la Plataforma está protegido por las leyes de propiedad intelectual aplicables en Venezuela.`
      },
      {
        heading: '5. Exención de Responsabilidad por Contenido de Terceros',
        content: `AxonMarket no se hace responsable del contenido publicado por los Comerciantes en sus tiendas virtuales (descripciones de productos, precios, imágenes, políticas de entrega). Cada Comerciante es el único y exclusivo responsable de la veracidad y legalidad de su contenido.`
      },
      {
        heading: '6. Disponibilidad del Servicio',
        content: `AxonMarket procura mantener la Plataforma disponible de manera continua, sin embargo, no garantiza disponibilidad ininterrumpida. Pueden producirse interrupciones por mantenimiento, actualizaciones tecnológicas o causas de fuerza mayor. AxonMarket no será responsable por daños derivados de interrupciones del servicio.`
      },
      {
        heading: '7. Jurisdicción',
        content: `Cualquier disputa, controversia o reclamación relacionada con el uso de la Plataforma será resuelta ante los tribunales competentes de la República Bolivariana de Venezuela, con renuncia expresa a cualquier otro fuero que pudiera corresponder a las partes.`
      }
    ]
  }
};

export default function LegalPage() {
  const { tipo } = useParams();
  const navigate = useNavigate();

  const content = LEGAL_CONTENT[tipo];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tipo]);

  if (!content) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Página legal no encontrada.</p>
          <button onClick={() => navigate('/ecommerce/live')} className="text-amber-500 hover:underline">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-50 font-sans">
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">{content.icon}</span>
            <span className="font-bold text-white text-sm md:text-base truncate">{content.title}</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-zinc-950 to-black border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-6">
            {content.icon}
          </div>
          <h1 className="text-3xl md:text-4xl font-light text-white tracking-tight mb-4">
            {content.title}
          </h1>
          <p className="text-zinc-500 text-sm">
            Última actualización: <span className="text-amber-500 font-medium">{content.lastUpdated}</span>
          </p>
          <p className="text-zinc-600 text-xs mt-3 max-w-lg mx-auto">
            Al usar AxonMarket, aceptas los términos descritos en este documento. 
            Te recomendamos leerlo completo.
          </p>
        </div>
      </div>

      {/* Navegación rápida entre documentos */}
      <div className="border-b border-white/5 bg-zinc-950/50">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {Object.entries(LEGAL_CONTENT).map(([key, val]) => (
              <Link
                key={key}
                to={`/ecommerce/legal/${key}`}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 ${
                  tipo === key
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                    : 'text-zinc-500 border-white/5 hover:text-white hover:border-white/10'
                }`}
              >
                {val.title.split(' ').slice(0, 2).join(' ')}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {content.sections.map((section, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="border-b border-white/5 pb-10 last:border-0"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/10 text-amber-500 text-xs font-black shrink-0 mt-0.5">
                {idx + 1}
              </span>
              {section.heading.replace(/^\d+\.\s*/, '')}
            </h2>
            <div className="text-zinc-400 text-sm leading-relaxed space-y-3 pl-9">
              {section.content.split('\n\n').map((para, pIdx) => (
                <p key={pIdx} className="whitespace-pre-line">{para}</p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer de la página legal */}
      <div className="border-t border-white/5 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-6 py-10 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center text-black">
              <Store size={14} className="stroke-[2.5]" />
            </div>
            <span className="font-bold tracking-[0.3em] text-white text-sm">AXON<span className="text-amber-500 font-light">MARKET</span></span>
          </div>
          <p className="text-zinc-600 text-xs">
            © {new Date().getFullYear()} AxonMarket. Todos los derechos reservados. República Bolivariana de Venezuela.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            {Object.entries(LEGAL_CONTENT).map(([key, val]) => (
              <Link
                key={key}
                to={`/ecommerce/legal/${key}`}
                className={`text-xs transition-colors ${tipo === key ? 'text-amber-500 font-bold' : 'text-zinc-500 hover:text-white'}`}
              >
                {val.title.split(' ').slice(0, 3).join(' ')}
              </Link>
            ))}
          </div>
          <button
            onClick={() => navigate('/ecommerce/live')}
            className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-500 transition-colors mt-2"
          >
            <ExternalLink size={12} />
            Volver al Marketplace
          </button>
        </div>
      </div>
    </div>
  );
}
