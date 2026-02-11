import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
export default function ContactBusiness() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Call edge function to handle inquiry
      const {
        error
      } = await supabase.functions.invoke('submit-inquiry', {
        body: formData
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Thank you for your inquiry. We will be in touch soon.');
    } catch (err) {
      console.error('Error submitting inquiry:', err);
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  if (submitted) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <motion.div className="text-center max-w-md px-6" initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }}>
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display mb-4">Message Sent</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for reaching out. Our team will review your inquiry and respond within 2-3 business days.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Return to home
          </Link>
        </motion.div>
      </div>;
  }
  return <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }}>
          <h1 className="text-3xl font-display mb-4">Business Inquiries</h1>
          <p className="text-muted-foreground mb-8">
            For investment opportunities, publishing partnerships, film/media rights, or other business matters, 
            please use the form below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Name *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({
                ...formData,
                name: e.target.value
              })} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Email *</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({
                ...formData,
                email: e.target.value
              })} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="your@email.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Subject *</label>
              <select required value={formData.subject} onChange={e => setFormData({
              ...formData,
              subject: e.target.value
            })} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select a topic...</option>
                <option value="investment">Investment Opportunity</option>
                <option value="publishing">Publishing Partnership</option>
                <option value="film_media">Film & Media Rights</option>
                <option value="licensing">Licensing</option>
                <option value="press">Press & Media</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-muted-foreground mb-2">Message *</label>
              <textarea required rows={6} value={formData.message} onChange={e => setFormData({
              ...formData,
              message: e.target.value
            })} className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" placeholder="Tell us about your inquiry..." />
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </> : <>
                  <Send className="w-4 h-4" />
                  Send Inquiry
                </>}
            </button>
          </form>

          <p className="text-base text-center mt-8 text-muted-foreground">
            For reader support, please use the Help section in your dashboard after logging in.
          </p>
        </motion.div>
      </main>
    </div>;
}