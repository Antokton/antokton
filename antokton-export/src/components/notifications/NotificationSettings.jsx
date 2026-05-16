import React, { useState, useEffect } from "react";
import { base44 } from "@/api/antoktonClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Bell, Volume2, VolumeX, Save, Check } from "lucide-react";

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    soundEnabled: true,
    notificationSound: 'default',
    browserNotifications: true,
    volume: 0.5
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('chat_notification_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Request notification permission if enabled
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('chat_notification_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testSound = () => {
    if (!settings.soundEnabled) return;
    
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different frequencies for different sounds
    const frequencies = {
      'default': 800,
      'beep': 600,
      'ding': 1000,
      'chime': 1200
    };
    
    oscillator.frequency.value = frequencies[settings.notificationSound] || 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(settings.volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Cilësimet e notifikimeve
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Enabled */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-white">Zëri i notifikimeve</Label>
            <p className="text-sm text-white/60">Aktivizo/çaktivizo tingullin për mesazhe të reja</p>
          </div>
          <Switch
            checked={settings.soundEnabled}
            onCheckedChange={(checked) => setSettings({ ...settings, soundEnabled: checked })}
          />
        </div>

        {/* Notification Sound Type */}
        {settings.soundEnabled && (
          <div className="space-y-2">
            <Label className="text-white">Lloji i ziles</Label>
            <div className="flex gap-2">
              <Select
                value={settings.notificationSound}
                onValueChange={(value) => setSettings({ ...settings, notificationSound: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white data-[state=open]:bg-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0b1020] border-white/20">
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="beep">Beep</SelectItem>
                  <SelectItem value="ding">Ding</SelectItem>
                  <SelectItem value="chime">Chime</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={testSound}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/10"
              >
                Test
              </Button>
            </div>
          </div>
        )}

        {/* Volume */}
        {settings.soundEnabled && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-white">Volumi</Label>
              <span className="text-white/60 text-sm">{Math.round(settings.volume * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <VolumeX className="w-4 h-4 text-white/40" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => setSettings({ ...settings, volume: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <Volume2 className="w-4 h-4 text-white/40" />
            </div>
          </div>
        )}

        {/* Browser Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-white">Njoftime në browser</Label>
            <p className="text-sm text-white/60">Merr njoftime edhe kur aplikacioni nuk është aktiv</p>
          </div>
          <Switch
            checked={settings.browserNotifications}
            onCheckedChange={(checked) => {
              setSettings({ ...settings, browserNotifications: checked });
              if (checked && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
              }
            }}
          />
        </div>

        {/* Permission Status */}
        {settings.browserNotifications && 'Notification' in window && (
          <div className="p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-white/60">
              Status i lejeve: {' '}
              <span className={`font-medium ${
                Notification.permission === 'granted' ? 'text-green-400' : 
                Notification.permission === 'denied' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {Notification.permission === 'granted' ? 'Të lejuara' : 
                 Notification.permission === 'denied' ? 'Të refuzuara' : 'Në pritje'}
              </span>
            </p>
            {Notification.permission === 'denied' && (
              <p className="text-xs text-white/40 mt-1">
                Aktivizo lejet në cilësimet e browser për të marrë njoftime
              </p>
            )}
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full hover:opacity-90 transition-all notification-save-btn"
          style={{ 
            background: 'linear-gradient(135deg, #8ab4ff 0%, #9bffd6 100%)',
            color: '#0b1020'
          }}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-2" style={{ color: '#0b1020', stroke: '#0b1020' }} />
              <span style={{ color: '#0b1020' }}>U ruajt</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" style={{ color: '#0b1020', stroke: '#0b1020' }} />
              <span style={{ color: '#0b1020' }}>Ruaj cilësimet</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}