import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Check, HelpCircle, X } from "lucide-react";
import moment from "moment";

export default function RSVPList({ rsvps = [] }) {
  const going = rsvps.filter(r => r.response === 'going');
  const maybe = rsvps.filter(r => r.response === 'maybe');
  const notGoing = rsvps.filter(r => r.response === 'not_going');

  const totalGuests = going.reduce((sum, r) => sum + (r.guests_count || 0), 0) + going.length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{going.length}</div>
              <div className="text-white/60 text-sm">Po Vijnë</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{maybe.length}</div>
              <div className="text-white/60 text-sm">Ndoshta</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{notGoing.length}</div>
              <div className="text-white/60 text-sm">Nuk Vijnë</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Going List */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Check className="w-5 h-5 text-green-400" />
            Po Vijnë ({going.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {going.length === 0 ? (
              <div className="text-white/40 text-sm">Askush akoma</div>
            ) : (
              going.map((rsvp, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="flex-1">
                    <div className="text-white/80 text-sm">{rsvp.user_email}</div>
                    {rsvp.guests_count > 0 && (
                      <div className="text-white/40 text-xs">
                        +{rsvp.guests_count} mysafir{rsvp.guests_count > 1 ? 'ë' : ''}
                      </div>
                    )}
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Po</Badge>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 text-white/60 text-sm pt-3 border-t border-white/10">
            <strong>Total:</strong> {totalGuests} {totalGuests === 1 ? 'person' : 'persona'}
          </div>
        </CardContent>
      </Card>

      {/* Maybe List */}
      {maybe.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <HelpCircle className="w-5 h-5 text-yellow-400" />
              Ndoshta ({maybe.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {maybe.map((rsvp, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="text-white/80 text-sm">{rsvp.user_email}</div>
                  <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Ndoshta</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Going List */}
      {notGoing.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <X className="w-5 h-5 text-red-400" />
              Nuk Vijnë ({notGoing.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notGoing.map((rsvp, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <div className="text-white/80 text-sm">{rsvp.user_email}</div>
                  <Badge className="bg-red-500/20 text-red-400 text-xs">Jo</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}