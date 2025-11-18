import { useState } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  LogOut,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { AuthUser } from "../types/user";
import { updateUserProfile } from "../utils/api";
import { toast } from "sonner@2.0.3";

interface MyAccountProps {
  currentUser: AuthUser;
  onBack: () => void;
  onLogout: () => void;
}

export function MyAccount({
  currentUser,
  onBack,
  onLogout,
}: MyAccountProps) {
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState(
    currentUser.user_metadata?.phone || "",
  );
  const [isSaving, setIsSaving] = useState(false);

  const validatePhone = (phone: string): boolean => {
    // Allow empty or valid phone formats (10-15 digits, with optional +, spaces, dashes, parentheses)
    if (!phone.trim()) return true;
    const phoneRegex =
      /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
  };

  const handleSavePhone = async () => {
    if (!validatePhone(phoneValue)) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(currentUser.id, {
        phone: phoneValue,
      });
      // Update local user metadata
      currentUser.user_metadata = {
        ...currentUser.user_metadata,
        phone: phoneValue,
      };
      setIsEditingPhone(false);
      toast.success("Phone number updated successfully");
    } catch (error: any) {
      // Error updating phone
      toast.error(
        error.message || "Failed to update phone number",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setPhoneValue(currentUser.user_metadata?.phone || "");
    setIsEditingPhone(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl mb-8">My Account</h1>

        <Card className="p-8">
          <div className="space-y-6">
            {/* Profile Info */}
            <div className="flex items-center gap-4 pb-6 border-b">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl">
                  {currentUser.user_metadata?.name || "User"}
                </h2>
                <p className="text-gray-600">
                  {currentUser.email}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5" />
                <span>{currentUser.email}</span>
              </div>

              {/* Phone Number Section */}
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-600 flex-shrink-0" />
                {isEditingPhone ? (
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="tel"
                      value={phoneValue}
                      onChange={(e) =>
                        setPhoneValue(e.target.value)
                      }
                      placeholder="Enter phone number"
                      className="flex-1"
                      disabled={isSaving}
                    />
                    <Button
                      size="sm"
                      onClick={handleSavePhone}
                      disabled={isSaving}
                      className="px-3"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-3"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-gray-600">
                      {currentUser.user_metadata?.phone ||
                        "Not provided"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingPhone(true)}
                      className="px-3"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-6 border-t">
              <Button
                onClick={onLogout}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}