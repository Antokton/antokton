import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, DownloadCloud, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function CalendarSync() {
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const handleSyncToGoogle = async (event) => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('syncGoogleCalendar', {
        action: 'sync_event',
        eventData: event
      });
      setSyncStatus({ type: 'success', message: 'Ngarja u sinkronizua me Google Calendar' });
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImportICS = async (file) => {
    setImportLoading(true);
    try {
      const content = await file.text();
      const result = await base44.functions.invoke('importICSFile', {
        icsContent: content
      });
      setSyncStatus({ 
        type: 'success', 
        message: `${result.data.importedCount} ngjarje u importuan` 
      });
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus({ type: 'error', message: error.message });
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.ics')) {
      handleImportICS(file);
    } else {
      setSyncStatus({ type: 'error', message: 'Ju lutemi zgjidhni një skedar .ics' });
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <DownloadCloud className="w-5 h-5" />
          Sinkronizimi i Kalendarit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-white font-semibold mb-3">Google Calendar</h4>
          <p className="text-white/60 text-sm mb-4">
            Sinkronizoni ngjarjet e krijuara në aplikacion me llogarinë tuaj të Google Calendar
          </p>
          <Button
            onClick={() => handleSyncToGoogle({ /* event data */ })}
            disabled={loading}
            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Po sinkronizohej...
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4 mr-2" />
                Lidh Google Calendar
              </>
            )}
          </Button>
        </div>

        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-white font-semibold mb-3">Importo nga ICS</h4>
          <p className="text-white/60 text-sm mb-4">
            Importoni ngjarje nga një skedar ICS (nga Outlook, iCal, etj)
          </p>
          <label>
            <input
              type="file"
              accept=".ics"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              asChild
              disabled={importLoading}
              className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 cursor-pointer"
            >
              <span>
                {importLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Po importohej...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Zgjidh Skedar ICS
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>

        {syncStatus && (
          <div className={`p-3 rounded-lg flex items-start gap-2 ${
            syncStatus.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {syncStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            )}
            <p className="text-sm">{syncStatus.message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}