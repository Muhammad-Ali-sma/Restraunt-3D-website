import { Chef } from "@/components/sections/Chef";
import { Course } from "@/components/sections/Course";
import { Evening } from "@/components/sections/Evening";
import { Footer } from "@/components/sections/Footer";
import { Hero } from "@/components/sections/Hero";
import { Nav } from "@/components/sections/Nav";
import { Reserve } from "@/components/sections/Reserve";
import { Story } from "@/components/sections/Story";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Story />
        <Course />
        <Evening />
        <Chef />
        <Reserve />
      </main>
      <Footer />
    </>
  );
}
