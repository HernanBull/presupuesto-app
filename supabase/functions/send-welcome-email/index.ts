import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name } = await req.json()

    if (!email) {
      throw new Error("El campo 'email' es obligatorio.")
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bienvenido a AxonMarket</title>
    </head>
    <body style="font-family: 'Inter', sans-serif; background-color: #000000; color: #ffffff; margin: 0; padding: 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000; padding: 40px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #111111; border: 1px solid #333333; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px; border-bottom: 1px solid #222222;">
                  <table cellpadding="0" cellspacing="0" style="margin: 0 auto; display: inline-block;">
                    <tr>
                      <td valign="middle" style="padding-right: 16px;">
                        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="42" height="42" rx="12" fill="url(#paint0_linear)"/>
                          <g transform="translate(10, 10) scale(0.9)" stroke="#000000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                          </g>
                          <defs>
                            <linearGradient id="paint0_linear" x1="0" y1="0" x2="42" y2="42" gradientUnits="userSpaceOnUse">
                              <stop stop-color="#fbbf24"/>
                              <stop offset="1" stop-color="#d97706"/>
                            </linearGradient>
                          </defs>
                        </svg>
                      </td>
                      <td valign="middle">
                        <h1 style="color: #ffffff; margin: 0; font-size: 32px; letter-spacing: 2px;">AXON<span style="color: #f59e0b; font-weight: 300;">MARKET</span></h1>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Body -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #f59e0b; margin-top: 0; font-size: 24px;">¡Bienvenido/a, ${name || 'Cliente Premium'}!</h2>
                  <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Nos emociona tenerte a bordo. AxonMarket es la plataforma más exclusiva y rápida para pedir en tus tiendas favoritas de la ciudad.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                    <tr>
                      <td style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); padding: 20px; border-radius: 12px; text-align: center;">
                        <p style="color: #f59e0b; font-size: 14px; font-weight: bold; margin: 0; text-transform: uppercase; letter-spacing: 1px;">
                          Tu cuenta ya está verificada
                        </p>
                        <p style="color: #d4d4d8; font-size: 14px; margin: 8px 0 0 0;">
                          Has iniciado sesión exitosamente con Google y estás listo/a para comprar.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; text-align: center;">
                    Explora los comercios, descubre ofertas y recibe todo en la puerta de tu casa con nuestro servicio de delivery VIP.
                  </p>
                  
                  <div style="text-align: center; margin-top: 40px;">
                    <a href="https://axonmarket.vip" style="display: inline-block; background-color: #f59e0b; color: #000000; font-weight: bold; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-size: 16px;">
                      Ir a la Plataforma
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="background-color: #0a0a0a; padding: 24px; border-top: 1px solid #222222;">
                  <p style="color: #52525b; font-size: 12px; margin: 0;">
                    &copy; ${new Date().getFullYear()} AxonMarket VIP. Todos los derechos reservados.<br>
                    Estás recibiendo este correo porque te registraste en nuestra plataforma.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'AxonMarket <soporte@axonmarket.vip>',
        to: [email],
        subject: '¡Bienvenido a AxonMarket! Tu cuenta está lista 🚀',
        html: htmlContent,
      })
    })

    const data = await res.json()

    if (res.ok) {
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      throw new Error(data.message || 'Error enviando email vía Resend')
    }
  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
