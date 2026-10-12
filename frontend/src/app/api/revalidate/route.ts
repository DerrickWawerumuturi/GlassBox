import {handleRevalidate} from "@/lib/revalidate";

/* The weekly publication job's call to refresh the market pages (lib/revalidate.ts). */
export async function POST(request: Request) {
    return handleRevalidate(request);
}
