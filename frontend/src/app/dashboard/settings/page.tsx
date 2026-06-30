"use client";

import { useState, useEffect } from "react";
import { getClinicSettings, updateClinicSettings } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MessageSquare, Save, Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  const [settings, setSettings] = useState({
    whatsapp_notifications: true,
    cancellation_notifications: true,
    booking_url: "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await getClinicSettings();
        if (res.data) {
          setSettings({
            whatsapp_notifications: res.data.whatsapp_notifications === 1,
            cancellation_notifications: res.data.cancellation_notifications === 1,
            booking_url: res.data.booking_url || "",
          });
        }
      } catch (err: any) {
        toast("error", "Failed to load clinic settings.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateClinicSettings({
        whatsapp_notifications: settings.whatsapp_notifications,
        cancellation_notifications: settings.cancellation_notifications,
        booking_url: settings.booking_url,
      });
      toast("success", "Settings saved successfully.");
    } catch (err: any) {
      toast("error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = () => {
    if (!testPhone) {
      toast("error", "Please enter a phone number to test.");
      return;
    }
    toast("success", `Test message would be sent to ${testPhone} in production.`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your clinic preferences and integrations.</p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Notifications (CallMeBot)
          </CardTitle>
          <CardDescription>
            Automatically send WhatsApp messages to your patients for booking confirmations and reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-800 text-sm mb-1">Setup Instructions</h4>
            <p className="text-sm text-blue-700">
              Your patients must activate CallMeBot once to receive messages. They need to send the message 
              <strong> &quot;I allow callmebot to send me messages&quot;</strong> to the CallMeBot WhatsApp number (+34 624 543 434) or use the bot link.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5">
                <label className="text-base font-semibold block">Booking Confirmation</label>
                <p className="text-sm text-muted-foreground">Send a WhatsApp message when a new appointment is booked.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.whatsapp_notifications}
                onChange={(e) => setSettings({ ...settings, whatsapp_notifications: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors">
              <div className="space-y-0.5">
                <label className="text-base font-semibold block">Cancellation Notice</label>
                <p className="text-sm text-muted-foreground">Notify patients when you cancel an appointment.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.cancellation_notifications}
                onChange={(e) => setSettings({ ...settings, cancellation_notifications: e.target.checked })}
                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label htmlFor="booking_url" className="font-semibold block">Booking URL</label>
              <p className="text-sm text-muted-foreground mb-2">Used in cancellation messages so patients can easily rebook.</p>
              <Input
                id="booking_url"
                placeholder="https://example.com/book"
                value={settings.booking_url}
                onChange={(e) => setSettings({ ...settings, booking_url: e.target.value })}
                className="max-w-md"
              />
            </div>
          </div>

          <div className="border-t pt-6 mt-6 space-y-4">
            <h4 className="font-semibold text-foreground">Test WhatsApp Integration</h4>
            <div className="flex gap-3 max-w-md">
              <Input
                placeholder="Patient Phone Number (e.g., 03001234567)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button variant="outline" onClick={handleTestMessage}>Send Test</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary-light h-11 px-8 shadow-md">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
