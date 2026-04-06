import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type EmergencyContact = Tables<"emergency_contacts">;

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relationship: string;
  isPrimary: boolean;
}

export const RELATIONSHIPS = [
  { value: "parent", label: "👨‍👩‍👧 Parent" },
  { value: "sibling", label: "👫 Sibling" },
  { value: "friend", label: "🤝 Friend" },
  { value: "guardian", label: "🛡️ Guardian" },
  { value: "partner", label: "💕 Partner" },
  { value: "relative", label: "👪 Relative" },
  { value: "neighbor", label: "🏠 Neighbor" },
  { value: "other", label: "📋 Other" },
];

export const getRelationshipLabel = (value: string | null) => {
  if (!value) return "Contact";
  const found = RELATIONSHIPS.find((relationship) => relationship.value === value);
  return found ? found.label : value;
};

export function useEmergencyContacts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const contactsQuery = useQuery({
    queryKey: ["contacts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addContact = useMutation({
    mutationFn: async (form: EmergencyContactInput) => {
      const { error } = await supabase.from("emergency_contacts").insert({
        user_id: user!.id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        relationship: form.relationship || null,
        is_primary: form.isPrimary,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", user?.id] });
      toast({
        title: "✅ Contact Added",
        description: "They will receive your SOS location link during emergencies.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", user?.id] });
      toast({ title: "Contact Removed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const togglePrimaryContact = useMutation({
    mutationFn: async ({ id, isPrimary }: { id: string; isPrimary: boolean }) => {
      const { error } = await supabase
        .from("emergency_contacts")
        .update({ is_primary: isPrimary })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const contacts = contactsQuery.data ?? [];

  return {
    contacts,
    isLoading: contactsQuery.isLoading,
    addContact,
    deleteContact,
    togglePrimaryContact,
  };
}