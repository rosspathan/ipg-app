import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAdminUserCreate } from "@/hooks/useAdminUserCreate";
import { Loader2 } from "lucide-react";

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  display_name: z.string().optional(),
  phone: z.string().optional(),
  account_status: z.enum(["active", "suspended", "pending"]).default("active"),
  kyc_status: z.enum(["none", "pending", "approved", "rejected"]).default("none"),
  initial_bsk_balance: z.coerce.number().min(0).max(1000000).optional(),
  role: z.enum(["user", "admin"]).default("user"),
  generate_password: z.boolean().default(true),
  custom_password: z.string().optional(),
}).refine((data) => {
  if (!data.generate_password && !data.custom_password) {
    return false;
  }
  if (!data.generate_password && data.custom_password) {
    return data.custom_password.length >= 8;
  }
  return true;
}, {
  message: "Password must be at least 8 characters",
  path: ["custom_password"],
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { toast } = useToast();
  const { createUser, isLoading } = useAdminUserCreate();
  const [generatePassword, setGeneratePassword] = useState(true);
  const [confirmAdmin, setConfirmAdmin] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      account_status: "active",
      kyc_status: "none",
      role: "user",
      generate_password: true,
      initial_bsk_balance: 0,
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: CreateUserFormData) => {
    if (data.role === "admin" && !confirmAdmin) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm you want to create an admin user",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await createUser({
        email: data.email,
        display_name: data.display_name,
        phone: data.phone,
        password: data.generate_password ? undefined : data.custom_password,
        account_status: data.account_status,
        kyc_status: data.kyc_status,
        initial_bsk_balance: data.initial_bsk_balance,
        role: data.role,
        send_welcome_email: true,
      });

      toast({
        title: "User Created",
        description: `User created successfully${result.temporary_password ? `. Password: ${result.temporary_password}` : ""}`,
      });

      reset();
      setConfirmAdmin(false);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%/0.4)]">
        <DialogHeader>
          <DialogTitle className="text-[hsl(0_0%_98%)]">Create New User</DialogTitle>
          <DialogDescription className="text-[hsl(240_10%_70%)]">
            Add a new user to the platform. All fields except email are optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-[hsl(0_0%_98%)]">
              Email *
            </Label>
            <Input
              id="email"
              {...register("email")}
              placeholder="user@example.com"
              className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]"
            />
            {errors.email && (
              <p className="text-xs text-[hsl(0_70%_68%)] mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <Label htmlFor="display_name" className="text-[hsl(0_0%_98%)]">
              Display Name
            </Label>
            <Input
              id="display_name"
              {...register("display_name")}
              placeholder="John Doe"
              className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone" className="text-[hsl(0_0%_98%)]">
              Phone
            </Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="+1234567890"
              className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]"
            />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4">
            {/* Account Status */}
            <div>
              <Label htmlFor="account_status" className="text-[hsl(0_0%_98%)]">
                Account Status
              </Label>
              <Select
                onValueChange={(value) => setValue("account_status", value as any)}
                defaultValue="active"
              >
                <SelectTrigger className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* KYC Status */}
            <div>
              <Label htmlFor="kyc_status" className="text-[hsl(0_0%_98%)]">
                KYC Status
              </Label>
              <Select
                onValueChange={(value) => setValue("kyc_status", value as any)}
                defaultValue="none"
              >
                <SelectTrigger className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Initial BSK Balance */}
          <div>
            <Label htmlFor="initial_bsk_balance" className="text-[hsl(0_0%_98%)]">
              Initial BSK Balance
            </Label>
            <Input
              id="initial_bsk_balance"
              type="number"
              {...register("initial_bsk_balance")}
              placeholder="0"
              min="0"
              max="1000000"
              className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]"
            />
            {errors.initial_bsk_balance && (
              <p className="text-xs text-[hsl(0_70%_68%)] mt-1">
                {errors.initial_bsk_balance.message}
              </p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <Label htmlFor="role" className="text-[hsl(0_0%_98%)]">
              Role
            </Label>
            <Select
              onValueChange={(value) => {
                setValue("role", value as any);
                if (value !== "admin") {
                  setConfirmAdmin(false);
                }
              }}
              defaultValue="user"
            >
              <SelectTrigger className="bg-[hsl(220_13%_7%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Admin Confirmation */}
          {selectedRole === "admin" && (
            <div className="flex items-center space-x-2 p-3 bg-[hsl(38_100%_60%/0.1)] border border-[hsl(38_100%_60%/0.3)] rounded-lg">
              <Checkbox
                id="confirm_admin"
                checked={confirmAdmin}
                onCheckedChange={(checked) => setConfirmAdmin(checked as boolean)}
              />
              <Label
                htmlFor="confirm_admin"
                className="text-sm text-[hsl(0_0%_98%)] cursor-pointer"
              >
                I confirm creating an admin user with elevated privileges
              </Label>
            </div>
          )}

          {/* Password Options */}
          <div className="space-y-3 p-4 bg-[hsl(220_13%_7%)] rounded-lg border border-[hsl(235_20%_22%/0.4)]">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate_password"
                checked={generatePassword}
                onCheckedChange={(checked) => {
                  setGeneratePassword(checked as boolean);
                  setValue("generate_password", checked as boolean);
                }}
              />
              <Label
                htmlFor="generate_password"
                className="text-sm text-[hsl(0_0%_98%)] cursor-pointer"
              >
                Generate random secure password
              </Label>
            </div>

            {!generatePassword && (
              <div>
                <Label htmlFor="custom_password" className="text-[hsl(0_0%_98%)]">
                  Custom Password
                </Label>
                <Input
                  id="custom_password"
                  type="password"
                  {...register("custom_password")}
                  placeholder="Min 8 characters"
                  className="bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]"
                />
                {errors.custom_password && (
                  <p className="text-xs text-[hsl(0_70%_68%)] mt-1">
                    {errors.custom_password.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[hsl(235_20%_22%/0.4)] text-[hsl(0_0%_98%)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_60%)] text-white"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
