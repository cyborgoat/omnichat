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

interface ProfileSettingsFormProps {
  // Define any props needed, e.g., for loading initial data or handling submission
  // For now, we'll manage state internally and use localStorage
}

export function ProfileSettingsForm({}: ProfileSettingsFormProps) {
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
        <h3 className="text-lg font-medium">Profile Settings</h3>
        <FormField
          control={profileForm.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Your username" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={profileForm.control}
          name="avatar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL</FormLabel>
              <FormControl>
                <Input placeholder="URL to your avatar" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save Profile</Button>
      </form>
    </Form>
  );
}

export default ProfileSettingsForm; 