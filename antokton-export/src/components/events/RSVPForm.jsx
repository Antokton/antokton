import React, { useState } from "react";
import { base44 } from "@/api/antoktonClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2, Users } from "lucide-react";

export default function RSVPForm({ event, userEmail, onSuccess }) {
  const [response, setResponse] = useState("maybe");
  const [guestCount, setGuestCount] = useState(0);
  const [specialRequests, setSpecialRequests] = useState("");
  const queryClient = useQueryClient();

  const rsvpMutation = useMutation({
    mutationFn: (data) => base44.entities.EventRSVP.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventRsvps", event.id] });
      if (onSuccess) onSuccess();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    rsvpMutation.mutate({
      event_id: event.id,
      user_email: userEmail,
      response,
      guests_count: parseInt(guestCount),
      special_requests: specialRequests,
      responded_at: new Date().toISOString()
    });
  };

  const responseLabels = {
    going: "👍 Unë vij",
    maybe: "❓ Ndoshta",
    not_going: "❌ Nuk vij"
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Përgjigja për Ngjarjen
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* RSVP Response */}
          <div>
            <Label className="text-white/70 mb-3 block">A do të vini?</Label>
            <RadioGroup value={response} onValueChange={setResponse}>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="going" id="going" className="border-white/30" />
                <Label htmlFor="going" className="text-white/80 cursor-pointer font-normal">
                  {responseLabels.going}
                </Label>
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <RadioGroupItem value="maybe" id="maybe" className="border-white/30" />
                <Label htmlFor="maybe" className="text-white/80 cursor-pointer font-normal">
                  {responseLabels.maybe}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not_going" id="not_going" className="border-white/30" />
                <Label htmlFor="not_going" className="text-white/80 cursor-pointer font-normal">
                  {responseLabels.not_going}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Guest Count */}
          {response === "going" && (
            <div>
              <Label className="text-white/70 mb-2 block">Numri i mysafirëve shtesë</Label>
              <Input
                type="number"
                min="0"
                max="5"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="0"
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-white/40 text-xs mt-1">Përveç jush</p>
            </div>
          )}

          {/* Special Requests */}
          <div>
            <Label className="text-white/70 mb-2 block">Kërkesa të veçanta</Label>
            <Textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="P.sh. alergjije, nevojat dietetike, etj"
              className="bg-white/5 border-white/10 text-white h-20"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={rsvpMutation.isPending}
            className="w-full bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] text-[#0b1020] hover:opacity-90"
          >
            {rsvpMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Po përpunohej...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Dërgo Përgjigjen
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}