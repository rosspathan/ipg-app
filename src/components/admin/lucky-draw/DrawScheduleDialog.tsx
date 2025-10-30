import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DrawConfig } from "@/hooks/useDrawManagement";

interface DrawScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule: (data: any) => void;
}

export function DrawScheduleDialog({ open, onOpenChange, onSchedule }: DrawScheduleDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    scheduled_time: "",
    entry_fee: 100,
    max_participants: 100,
    first_prize_amount: 5000,
    second_prize_amount: 2000,
    third_prize_amount: 1000,
  });

  const handleSubmit = () => {
    onSchedule(formData);
    onOpenChange(false);
    setFormData({
      name: "",
      scheduled_time: "",
      entry_fee: 100,
      max_participants: 100,
      first_prize_amount: 5000,
      second_prize_amount: 2000,
      third_prize_amount: 1000,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Draw</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Draw Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Weekend Mega Draw"
            />
          </div>

          <div>
            <Label htmlFor="scheduled_time">Scheduled Time</Label>
            <Input
              id="scheduled_time"
              type="datetime-local"
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="entry_fee">Entry Fee (BSK)</Label>
              <Input
                id="entry_fee"
                type="number"
                value={formData.entry_fee}
                onChange={(e) => setFormData({ ...formData, entry_fee: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="max_participants">Max Participants</Label>
              <Input
                id="max_participants"
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Prize Structure</h3>
            
            <div>
              <Label htmlFor="first_prize">1st Prize (BSK)</Label>
              <Input
                id="first_prize"
                type="number"
                value={formData.first_prize_amount}
                onChange={(e) => setFormData({ ...formData, first_prize_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="second_prize">2nd Prize (BSK)</Label>
              <Input
                id="second_prize"
                type="number"
                value={formData.second_prize_amount}
                onChange={(e) => setFormData({ ...formData, second_prize_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <Label htmlFor="third_prize">3rd Prize (BSK)</Label>
              <Input
                id="third_prize"
                type="number"
                value={formData.third_prize_amount}
                onChange={(e) => setFormData({ ...formData, third_prize_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Schedule Draw
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}