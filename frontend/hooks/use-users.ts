import { useQuery } from "@tanstack/react-query";

export function useUsers() {
    return useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await fetch("/api/users");
            if (!res.ok) {
                throw new Error("Failed to fetch users");
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                return { users: data };
            }
            return data;
        },
    });
}
