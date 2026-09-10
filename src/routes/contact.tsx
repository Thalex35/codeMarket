import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact CodeMarket — questions, purchases and support" },
      {
        name: "description",
        content:
          "Get in touch with the CodeMarket team about software purchases, support requests or custom application ideas.",
      },
      { property: "og:title", content: "Contact CodeMarket" },
      {
        property: "og:description",
        content: "Questions about a purchase, support or a custom application? Send a message.",
      },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  subject: z.string().trim().min(3, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Your message is a bit short").max(2000),
});

function Contact() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [values, setValues] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        ...parsed.data,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
      trackEvent("contact");
      setSent(true);
      setValues({ name: "", email: "", subject: "", message: "" });
      toast.success("Message sent. We'll get back to you soon.");
    } catch {
      toast.error("We couldn't send your message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h1 className="font-display text-3xl font-bold">Contact us</h1>
          <p className="mt-2 text-muted-foreground">
            Questions about a purchase, a bug or a custom application? Send a message and we'll
            reply.
          </p>

          {sent ? (
            <div className="mt-8 rounded-xl border bg-card p-6">
              <h2 className="font-display text-lg font-semibold">Thanks for reaching out</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your message has been received. We usually reply within one business day.
              </p>
              <Button className="mt-4" variant="outline" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={values.name}
                    maxLength={100}
                    onChange={(event) => setValues({ ...values, name: event.target.value })}
                  />
                  {errors["name"] ? (
                    <p className="text-xs text-destructive">{errors["name"]}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={values.email}
                    maxLength={255}
                    onChange={(event) => setValues({ ...values, email: event.target.value })}
                  />
                  {errors["email"] ? (
                    <p className="text-xs text-destructive">{errors["email"]}</p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={values.subject}
                  maxLength={150}
                  onChange={(event) => setValues({ ...values, subject: event.target.value })}
                />
                {errors["subject"] ? (
                  <p className="text-xs text-destructive">{errors["subject"]}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={6}
                  value={values.message}
                  maxLength={2000}
                  onChange={(event) => setValues({ ...values, message: event.target.value })}
                />
                {errors["message"] ? (
                  <p className="text-xs text-destructive">{errors["message"]}</p>
                ) : null}
              </div>
              <Button type="submit" disabled={sending}>
                {sending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="mr-2 h-4 w-4" aria-hidden />
                )}
                Send message
              </Button>
            </form>
          )}
        </div>

        <aside className="h-fit rounded-xl border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Other ways to reach us</h2>
          <ul className="mt-4 space-y-4 text-sm">
            {settings["contact_email"] ? (
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                <a className="hover:underline" href={`mailto:${settings["contact_email"]}`}>
                  {settings["contact_email"]}
                </a>
              </li>
            ) : null}
            {settings["whatsapp_number"] ? (
              <li className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
                <span>WhatsApp {settings["whatsapp_number"]}</span>
              </li>
            ) : null}
          </ul>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            {["facebook_url", "twitter_url", "linkedin_url", "github_url"]
              .filter((key) => settings[key])
              .map((key) => (
                <a
                  key={key}
                  href={settings[key]}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block hover:text-foreground"
                >
                  {key.replace("_url", "").replace(/^./, (char) => char.toUpperCase())}
                </a>
              ))}
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}
