import { useState } from 'react';
import { ArrowLeft, Mail, Send, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { submitContactMessage } from '../utils/api';
import { RECAPTCHA_SITE_KEY, executeRecaptcha, resetRecaptcha } from '../utils/recaptcha';

interface ContactPageProps {
  onBack: () => void;
}

export function ContactPage({ onBack }: ContactPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get reCAPTCHA token (only if configured)
      let recaptchaToken: string | undefined;
      if (RECAPTCHA_SITE_KEY) {
        try {
          recaptchaToken = await executeRecaptcha('contact');
        } catch (recaptchaError: any) {
          toast.error(recaptchaError.message || 'reCAPTCHA verification failed. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      await submitContactMessage({
        name,
        email,
        subject,
        message,
        status: 'new',
        recaptchaToken,
      });

      toast.success('Message sent! We\'ll get back to you soon.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      
      // Reset reCAPTCHA (if configured)
      if (RECAPTCHA_SITE_KEY) {
        resetRecaptcha();
      }
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
      if (RECAPTCHA_SITE_KEY) {
        resetRecaptcha();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl mb-2">Contact Us</h1>
          <p className="text-gray-600">Have a question? We'd love to hear from you!</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="How can we help?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="Tell us more..."
                rows={6}
              />
            </div>

            {/* reCAPTCHA v3 is invisible - no widget needed */}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 py-6"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}