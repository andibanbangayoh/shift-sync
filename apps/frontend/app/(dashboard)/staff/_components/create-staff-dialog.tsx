"use client";

import { useState } from "react";
import { useCreateStaffMutation } from "@/store/api/staffApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  callerRole: string;
}

export function CreateStaffDialog({ open, onOpenChange, callerRole }: Props) {
  const [createStaff, { isLoading }] = useCreateStaffMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STAFF" | "MANAGER">("STAFF");
  const [phone, setPhone] = useState("");
  const [desiredHours, setDesiredHours] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setRole("STAFF");
    setPhone("");
    setDesiredHours("");
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstName || !lastName || !email || !password) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      const result = await createStaff({
        firstName,
        lastName,
        email,
        password,
        role,
        ...(phone && { phone }),
        ...(desiredHours && { desiredWeeklyHours: parseFloat(desiredHours) }),
      }).unwrap();
      setSuccess(
        `${result.firstName} ${result.lastName} has been added as ${role}.`,
      );
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to create staff member";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Staff Member
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
              />
            </div>
            <div>
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@coastaleats.com"
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">
              Temporary Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, upper + lower + number"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Staff member can change this after first login
            </p>
          </div>

          {/* Role */}
          <div>
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "STAFF" | "MANAGER")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STAFF">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800 text-[10px]"
                    >
                      STAFF
                    </Badge>
                    Staff Member
                  </div>
                </SelectItem>
                {callerRole === "ADMIN" && (
                  <SelectItem value="MANAGER">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 text-[10px]"
                      >
                        MANAGER
                      </Badge>
                      Manager
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="hours">Desired Hours/wk</Label>
              <Input
                id="hours"
                type="number"
                value={desiredHours}
                onChange={(e) => setDesiredHours(e.target.value)}
                placeholder="40"
                min={0}
                max={80}
              />
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded p-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded p-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Account
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
