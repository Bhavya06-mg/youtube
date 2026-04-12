import CategoryTabs from "@/src/components/category-tabs";
import Videogrid from "@/src/components/Videogrid";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="flex-1 p-4">
      <CategoryTabs />
      <Suspense fallback={<div>Loading videos...</div>}>
        <Videogrid />
      </Suspense>
    </main>
  );
}