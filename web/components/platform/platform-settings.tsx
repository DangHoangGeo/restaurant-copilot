'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Shield, Bell, Database } from 'lucide-react';

export default function PlatformSettings() {
  const tc = useTranslations('platform.common');

  return (
    <div className="space-y-6 max-w-2xl">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            <CardTitle>General</CardTitle>
          </div>
          <CardDescription>Basic platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform-name">Platform name</Label>
            <Input id="platform-name" defaultValue="Coorder" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-email">Support email</Label>
            <Input id="support-email" type="email" defaultValue="support@coorder.com" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Maintenance mode</p>
              <p className="text-xs text-gray-500">Temporarily disable access for all tenants</p>
            </div>
            <Switch />
          </div>
          <Button>{tc('save')}</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-500" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Authentication and access control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Require MFA for admins</p>
              <p className="text-xs text-gray-500">All platform admins must use two-factor authentication</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">IP allow-listing</p>
              <p className="text-xs text-gray-500">Restrict admin access to specific IP ranges</p>
            </div>
            <Switch />
          </div>
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Session timeout (minutes)</Label>
            <Input id="session-timeout" type="number" defaultValue="60" className="w-32" />
          </div>
          <Button>{tc('save')}</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-500" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Configure admin alert preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New restaurant signups</p>
              <p className="text-xs text-gray-500">Email alert when a new restaurant registers</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Payment failures</p>
              <p className="text-xs text-gray-500">Alert when a subscription payment fails</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SLA breaches</p>
              <p className="text-xs text-gray-500">Alert when a support ticket exceeds SLA</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Button>{tc('save')}</Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Database / Maintenance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-gray-500" />
            <CardTitle>Maintenance</CardTitle>
          </div>
          <CardDescription>Database and system maintenance tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Recalculate usage snapshots</p>
              <p className="text-xs text-gray-500">Force a rebuild of today&apos;s usage metrics</p>
            </div>
            <Button variant="outline" size="sm">Run now</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Clear expired sessions</p>
              <p className="text-xs text-gray-500">Remove all expired customer ordering sessions</p>
            </div>
            <Button variant="outline" size="sm">Clean up</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
