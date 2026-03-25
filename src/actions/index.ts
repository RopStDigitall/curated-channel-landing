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
    }),
    handler: async ({ name, email, phone }, context) => {
      const resend = new Resend(context.locals.runtime.env.RESEND_API_KEY);

      const { error } = await resend.emails.send({
        from: "Curated Channel <onboarding@resend.dev>",
        to: "james@woollooshoe.com",
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
        throw new ActionError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    },
  }),
};
