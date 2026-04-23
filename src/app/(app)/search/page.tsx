import { Metadata } from "next";
import SearchContent from "@/components/search/SearchContent";

export const metadata: Metadata = { title: "Search — BrainHistory" };

export default function SearchPage() {
  return <SearchContent />;
}
