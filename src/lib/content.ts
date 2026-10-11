export type DishKind = "otoro" | "sake" | "akami" | "tamago" | "maki";

export type Course = {
  id: DishKind;
  no: string;
  jp: string;
  name: string;
  origin: string;
  note: string;
};

export const courses: Course[] = [
  {
    id: "otoro",
    no: "I",
    jp: "大トロ",
    name: "Otoro",
    origin: "Bluefin belly · Ōma, Aomori",
    note: "The richest cut of the bluefin, marbled like silk. Brushed with nikiri and served at body temperature so the fat melts as it lands.",
  },
  {
    id: "sake",
    no: "II",
    jp: "鮭",
    name: "Sake",
    origin: "King salmon · Shiretoko, Hokkaido",
    note: "Cured for forty minutes in kombu, then kissed with binchōtan. Smoke and sweetness in a single bite.",
  },
  {
    id: "akami",
    no: "III",
    jp: "漬け赤身",
    name: "Akami Zuke",
    origin: "Lean bluefin · Katsuura, Chiba",
    note: "Marinated for an hour in aged shoyu and mirin. Deep, clean, and lacquer-bright — the backbone of the evening.",
  },
  {
    id: "tamago",
    no: "IV",
    jp: "玉子",
    name: "Tamago",
    origin: "House recipe since 1987",
    note: "Twenty thin layers of egg, dashi and shrimp, rolled one at a time. Custard-soft and quietly sweet, bound with a belt of nori.",
  },
  {
    id: "maki",
    no: "V",
    jp: "細巻",
    name: "Hosomaki",
    origin: "Salmon · avocado · shiso",
    note: "A closing roll pressed by hand, with crisp Ariake nori that still crackles when it reaches you.",
  },
];
