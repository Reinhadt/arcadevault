"use server";

import { Resend } from "resend";

export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
  honeypot: string; // debe llegar vacío en un envío legítimo
}

export interface ContactActionResult {
  success: boolean;
  error?: string; // solo presente cuando success === false
}

export async function sendContactMessage(
  input: ContactFormInput
): Promise<ContactActionResult> {
  if (input.honeypot) {
    return { success: true };
  }

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;

  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    return {
      success: false,
      error:
        "El formulario de contacto no está configurado. Faltan variables de entorno de Resend.",
    };
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: input.email,
      subject: `Nuevo mensaje de contacto de ${input.name}`,
      text: `Nombre: ${input.name}\nEmail: ${input.email}\n\n${input.message}`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "No se pudo enviar el mensaje. Intentá de nuevo más tarde.",
    };
  }
}
