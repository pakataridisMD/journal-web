import type { Metadata } from "next";
import { ReviewsList } from "@/components/dashboard/reviews/reviews-list";

/** Rendered in the browser after sign-in; see the dashboard layout. */
export const instant = false;

export const metadata: Metadata = { title: "Review invitations" };

export default function ReviewsPage() {
  return <ReviewsList />;
}
