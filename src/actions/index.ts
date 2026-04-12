import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { Resend } from "resend";

export const server = {
  contact: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
      phone: z.string().optional(),
      _hp: z.string().optional(), // honeypot
    }),
    handler: async ({ name, email, phone, _hp }, context) => {
      if (_hp) {
        return { success: true };
      }

      const ip = context.request.headers.get("CF-Connecting-IP") ?? "unknown";
      const kv: KVNamespace | undefined = (context.locals as any).runtime?.env
        ?.CONTACT_RATE_LIMIT;

      if (kv) {
        const key = `rate:${ip}`;
        const current = parseInt((await kv.get(key)) ?? "0");
        if (current >= 3) {
          throw new ActionError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many submissions. Please try again later.",
          });
        }
        await kv.put(key, String(current + 1), { expirationTtl: 600 });
      }

      const apiKey = context.locals.runtime.env.RESEND_API_KEY;
      if (!apiKey) {
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Missing API key",
        });
      }
      const resend = new Resend(apiKey);

      const { error } = await resend.emails.send({
        from: "Curated Channel <noreply@notifications.realcloudtracking.com>",
        to: "camilo@ropstdigitall.com",
        subject: `New contact from ${name}`,
        html: `
          <h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
        `,
        replyTo: email,
      });

      if (error) {
        console.error("Resend error:", error);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    },
  }),
};
