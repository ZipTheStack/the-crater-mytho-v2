import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-display mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <section>
            <h2 className="text-xl font-serif mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using The Crater Mythos platform, you agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-4">2. Use of Service</h2>
            <p className="text-muted-foreground mb-4">
              You agree to use our platform only for lawful purposes and in accordance with these Terms. 
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Maintaining the confidentiality of your account</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us of any unauthorized use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-4">3. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on this platform, including but not limited to text, graphics, logos, 
              and literary works, is the property of The Crater Mythos and is protected by 
              copyright and intellectual property laws. You may not reproduce, distribute, or 
              create derivative works without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-4">4. Subscriptions and Payments</h2>
            <p className="text-muted-foreground mb-4">
              Subscriptions are billed on a recurring basis. You may cancel your subscription 
              at any time through your account settings. Refunds are handled according to our 
              refund policy. One-time purchases are non-refundable unless required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-4">5. Content Access</h2>
            <p className="text-muted-foreground">
              Access to content is granted based on your subscription tier or individual purchases. 
              Content is for personal, non-commercial use only. Sharing account credentials or 
              redistributing content is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              The Crater Mythos shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages arising from your use of our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-4">7. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. We will notify users of 
              significant changes via email or platform notification. Continued use after changes 
              constitutes acceptance of new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-serif mb-4">8. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms of Service, please contact us at legal@cratermythos.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
