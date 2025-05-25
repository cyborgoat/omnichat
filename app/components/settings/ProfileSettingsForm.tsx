"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect } from "react";
import { toast } from "sonner";

// Define the schema for Profile Settings
const profileSchema = z.object({
  username: z.string().min(2, { message: "Username must be at least 2 characters." }).optional(),
  avatar: z.string().url({ message: "Please enter a valid URL." }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettingsForm() {
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
      avatar: "",
    },
  });

  useEffect(() => {
    // Load saved data from localStorage
    const savedUsername = localStorage.getItem("profileUsername");
    const savedAvatar = localStorage.getItem("profileAvatar");
    if (savedUsername) {
      profileForm.setValue("username", savedUsername);
    }
    if (savedAvatar) {
      profileForm.setValue("avatar", savedAvatar);
    }
  }, [profileForm]);

  function onProfileSubmit(data: ProfileFormValues) {
    console.log("Profile Data Submitted:", data);
    if (data.username !== undefined) {
        localStorage.setItem("profileUsername", data.username);
    }
    if (data.avatar !== undefined) {
        localStorage.setItem("profileAvatar", data.avatar);
    }
    toast.success("Profile settings saved!");
  }

  return (
    <Form {...profileForm}>
      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 py-4">
        <h3 className="text-md font-medium">Profile Settings</h3>
        <FormField
          control={profileForm.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs mb-0.5">Username</FormLabel>
              <FormControl>
                <Input placeholder="Your username" {...field} value={field.value || ""} className="text-xs placeholder:opacity-60 h-8 px-2 py-1" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <FormField
          control={profileForm.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs mb-0.5">Avatar URL</FormLabel>
              <FormControl>
                <Input placeholder="URL to your avatar" {...field} value={field.value || ""} className="text-xs placeholder:opacity-60 h-8 px-2 py-1" />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <Button type="submit" className="text-xs">Save Profile</Button>
      </form>
    </Form>
  );
}

export default ProfileSettingsForm; 