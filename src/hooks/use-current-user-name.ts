import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export const useCurrentUserName = () => {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileName = async () => {
      const { data, error } = await createClient().auth.getUser();
      if (error) {
        console.error(error);
      }

      //   setName(data.session?.user.user_metadata.full_name ?? "?");
      setName(data.user?.user_metadata.full_name ?? "?");
    };

    fetchProfileName();
  }, []);

  return name || "?";
};
