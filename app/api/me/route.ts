import { getChatGPTUser } from "@/app/chatgpt-auth";

const ADMIN_USER_ID = "f2dfe94b-86ca-46d5-9642-b6ce46630220";

export async function GET() {
  const user = await getChatGPTUser();
  return Response.json(
    { isAdmin: user?.userId === ADMIN_USER_ID, displayName: user?.displayName ?? null },
    {
      headers: {
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        Vary: "oai-authenticated-user-id",
      },
    },
  );
}
