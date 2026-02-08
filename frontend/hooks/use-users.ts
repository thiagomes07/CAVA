import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useUsers() {
    return useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const data = await apiClient.get<{ users: unknown[] }>("/users");
            if (Array.isArray(data)) {
                return { users: data };
            }
            return data;
        },
    });
}
