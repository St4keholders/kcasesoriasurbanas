import { Hero } from "@/components/sections/Hero";
import { Agenda } from "@/components/sections/Agenda";
import { Servicios } from "@/components/sections/Servicios";
import { Horarios } from "@/components/sections/Horarios";
import { Ubicacion } from "@/components/sections/Ubicacion";
import { CtaFinal } from "@/components/sections/CtaFinal";

export default function Home() {
  return (
    <>
      <Hero />
      <Agenda />
      <Servicios />
      <Horarios />
      <Ubicacion />
      <CtaFinal />
    </>
  );
}
