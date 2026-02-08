import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useClientes() {
    return useQuery({
        queryKey: ["clientes"],
        queryFn: async () => {
            const data = await apiClient.get<{ clientes: unknown[] }>("/clientes");
            if (Array.isArray(data)) {
                return { clientes: data };
            }
            return data;
        },
    });
}
