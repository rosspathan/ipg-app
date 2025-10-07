import { ArrowLeft, MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigation } from "@/hooks/useNavigation";
import { SupportLinkWhatsApp } from "@/components/support/SupportLinkWhatsApp";

/**
 * Support Page - Fallback when WhatsApp links are blocked
 * Provides alternative contact methods
 */
export function SupportPage() {
  const { navigate } = useNavigation();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app/home")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Support</h1>
            <p className="text-sm text-muted-foreground">
              Get help from our support team
            </p>
          </div>
        </div>

        {/* WhatsApp Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SupportLinkWhatsApp variant="inline" />
              WhatsApp Support
            </CardTitle>
            <CardDescription>
              Chat with us on WhatsApp for quick assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <SupportLinkWhatsApp variant="fab" className="mx-auto" />
              <p className="text-sm text-muted-foreground">
                Available 24/7 • +91 91334 44118
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alternative Contact Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Alternative Contact Methods</CardTitle>
            <CardDescription>
              If WhatsApp isn't working, try these options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <Phone className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Phone Support</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Call us directly for immediate assistance
                </p>
                <a
                  href="tel:+919133444118"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  +91 91334 44118
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Email Support</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Send us an email and we'll respond within 24 hours
                </p>
                <a
                  href="mailto:support@i-smartapp.com"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  support@i-smartapp.com
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Link */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Find answers to common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/app/faq")}
            >
              View FAQ
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
