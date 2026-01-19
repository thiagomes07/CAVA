import { useQuery } from "@tanstack/react-query";

export function useClientes() {
    return useQuery({
        queryKey: ["clientes"],
        queryFn: async () => {
            const res = await fetch("/api/clientes");
            if (!res.ok) {
                throw new Error("Failed to fetch clientes");
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                return { clientes: data };
            }
            return data;
        },
    });
}
