import { permanentRedirect } from "next/navigation";

/** The board moved to the Who we are page; old links keep working. */
export default function EditorialBoardPage() {
  permanentRedirect("/who-we-are#editorial-board");
}
