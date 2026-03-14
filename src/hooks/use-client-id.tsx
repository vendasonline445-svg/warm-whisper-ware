import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useClientId() {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("clients")
          .select("id")
          .eq("contact_email", data.user.email)
          .single()
          .then(({ data: client }) => {
            if (client) setClientId(client.id);
          });
      }
    });
  }, []);

  return clientId;
}
