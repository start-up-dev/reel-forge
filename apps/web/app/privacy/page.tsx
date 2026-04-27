import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SITE } from "@/lib/content";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary font-sans selection:bg-accent-primary/30">
      {/* ─── Header ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/5 bg-bg-base/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <div className="text-sm font-bold tracking-tight uppercase">
            {SITE.name} <span className="text-accent-primary">Privacy</span>
          </div>
        </div>
      </header>

      {/* ─── Content ──────────────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-text-secondary mb-12">Last Updated: April 27, 2026</p>

        <div className="prose prose-invert max-w-none space-y-10">
          <section>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">
              1. Introduction
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Welcome to {SITE.name}, operated by{" "}
              <span className="text-text-primary font-medium">Make Real LLC</span>.
              We are committed to protecting your personal information and your
              right to privacy. This Privacy Policy explains how we collect,
              use, and safeguard your data when you use our platform to generate
              short-form videos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">
              2. Information We Collect
            </h2>
            <div className="space-y-4 text-text-secondary leading-relaxed">
              <p>
                We collect personal information that you provide to us when you
                register, use our services, or contact us:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-text-primary">Account Information:</strong> We
                  use Clerk for authentication. This includes your email
                  address, name, and profile information provided by social
                  login providers.
                </li>
                <li>
                  <strong className="text-text-primary">Content Data:</strong> We collect
                  the ideas, scripts, and prompts you input into our platform to
                  generate videos.
                </li>
                <li>
                  <strong className="text-text-primary">Media Assets:</strong> We store
                  the images, audio files, and finished videos generated through
                  our pipeline.
                </li>
                <li>
                  <strong className="text-text-primary">Payment Information:</strong> All
                  payments are processed by{" "}
                  <strong className="text-text-primary">Stripe</strong>. We do not store
                  your credit card details on our servers.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">
              3. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-text-secondary leading-relaxed">
              <li>To provide and maintain our video generation service.</li>
              <li>To process your payments and manage your subscription.</li>
              <li>To communicate with you regarding your video status and account updates.</li>
              <li>To improve our AI pipeline and user experience.</li>
              <li>To enforce our terms of service and prevent abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">
              4. Data Sharing and Sub-processors
            </h2>
            <p className="text-text-secondary leading-relaxed mb-4">
              We share data with the following third-party services to provide
              our core functionality:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-text-secondary leading-relaxed">
              <li>
                <strong className="text-text-primary">Claude (Anthropic):</strong> For
                script generation and scene splitting.
              </li>
              <li>
                <strong className="text-text-primary">ElevenLabs:</strong> For
                voiceover generation and word-level timestamps.
              </li>
              <li>
                <strong className="text-text-primary">Grok (xAI):</strong> For image
                generation.
              </li>
              <li>
                <strong className="text-text-primary">Google Cloud Platform (GCP):</strong> For
                storing media assets and running our assembly worker.
              </li>
              <li>
                <strong className="text-text-primary">Stripe:</strong> For secure
                payment processing.
              </li>
              <li>
                <strong className="text-text-primary">Clerk:</strong> For identity
                management.
              </li>
              <li>
                <strong className="text-text-primary">Resend:</strong> For
                transactional email notifications.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">
              5. Data Retention
            </h2>
            <p className="text-text-secondary leading-relaxed">
              Finished videos are retained in our storage for 30 days before
              being automatically deleted. Intermediate assets (draft clips,
              raw audio, base images) are purged shortly after the final video
              assembly is successful. User account data is retained as long as
              your account is active.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">
              6. Your Rights
            </h2>
            <p className="text-text-secondary leading-relaxed">
              You have the right to access, correct, or delete your personal
              information. You can manage your project and video data directly
              from the dashboard. For full account deletion requests, please
              contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">
              7. Contact Us
            </h2>
            <p className="text-text-secondary leading-relaxed">
              If you have any questions about this Privacy Policy, please
              contact the Make Real LLC team.
            </p>
          </section>
        </div>
      </main>

      {/* ─── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12 bg-[#060608]">
        <div className="max-w-4xl mx-auto px-6 text-center text-text-muted text-sm">
          <p>© {new Date().getFullYear()} Make Real LLC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
