export const trpcEndpoint = `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/trpc`;

export async function callTrpcHealth() {
  const response = await fetch(`${trpcEndpoint}/health`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("tRPC health check failed");
  }

  return response.json();
}
