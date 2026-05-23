import type { LoteriaCard } from "@/lib/loteria";

export type WorldCup2026Card = LoteriaCard & {
  confederation: string;
  isDebutant?: boolean;
  qualificationType?: string;
};

const flagBasePath = "/decks/worldcup2026/flags";

export const worldCup2026Cards: WorldCup2026Card[] = [
  { number: 1, slug: "mexico", name: "Mexico", confederation: "CONCACAF", qualificationType: "Anfitrion", image: `${flagBasePath}/Mexico.svg` },
  { number: 2, slug: "estados-unidos", name: "Estados Unidos", confederation: "CONCACAF", qualificationType: "Anfitrion", image: `${flagBasePath}/Estados_Unidos.svg` },
  { number: 3, slug: "canada", name: "Canada", confederation: "CONCACAF", qualificationType: "Anfitrion", image: `${flagBasePath}/Canada.svg` },
  { number: 4, slug: "argentina", name: "Argentina", confederation: "CONMEBOL", image: `${flagBasePath}/Argentina.svg` },
  { number: 5, slug: "brasil", name: "Brasil", confederation: "CONMEBOL", image: `${flagBasePath}/Brasil.svg` },
  { number: 6, slug: "uruguay", name: "Uruguay", confederation: "CONMEBOL", image: `${flagBasePath}/Uruguay.svg` },
  { number: 7, slug: "colombia", name: "Colombia", confederation: "CONMEBOL", image: `${flagBasePath}/Colombia.svg` },
  { number: 8, slug: "ecuador", name: "Ecuador", confederation: "CONMEBOL", image: `${flagBasePath}/Ecuador.svg` },
  { number: 9, slug: "paraguay", name: "Paraguay", confederation: "CONMEBOL", image: `${flagBasePath}/Paraguay.svg` },
  { number: 10, slug: "alemania", name: "Alemania", confederation: "UEFA", image: `${flagBasePath}/Alemania.svg` },
  { number: 11, slug: "espana", name: "Espana", confederation: "UEFA", image: `${flagBasePath}/Espana.svg` },
  { number: 12, slug: "francia", name: "Francia", confederation: "UEFA", image: `${flagBasePath}/Francia.svg` },
  { number: 13, slug: "inglaterra", name: "Inglaterra", confederation: "UEFA", image: `${flagBasePath}/Inglaterra.svg` },
  { number: 14, slug: "portugal", name: "Portugal", confederation: "UEFA", image: `${flagBasePath}/Portugal.svg` },
  { number: 15, slug: "paises-bajos", name: "Paises Bajos", confederation: "UEFA", image: `${flagBasePath}/Paises_Bajos.svg` },
  { number: 16, slug: "belgica", name: "Belgica", confederation: "UEFA", image: `${flagBasePath}/Belgica.svg` },
  { number: 17, slug: "croacia", name: "Croacia", confederation: "UEFA", image: `${flagBasePath}/Croacia.svg` },
  { number: 18, slug: "suiza", name: "Suiza", confederation: "UEFA", image: `${flagBasePath}/Suiza.svg` },
  { number: 19, slug: "austria", name: "Austria", confederation: "UEFA", image: `${flagBasePath}/Austria.svg` },
  { number: 20, slug: "turquia", name: "Turquia", confederation: "UEFA", image: `${flagBasePath}/Turquia.svg` },
  { number: 21, slug: "noruega", name: "Noruega", confederation: "UEFA", image: `${flagBasePath}/Noruega.svg` },
  { number: 22, slug: "suecia", name: "Suecia", confederation: "UEFA", image: `${flagBasePath}/Suecia.svg` },
  { number: 23, slug: "escocia", name: "Escocia", confederation: "UEFA", image: `${flagBasePath}/Escocia.svg` },
  { number: 24, slug: "republica-checa", name: "Republica Checa", confederation: "UEFA", image: `${flagBasePath}/Republica_Checa.svg` },
  { number: 25, slug: "bosnia-y-herzegovina", name: "Bosnia y Herzegovina", confederation: "UEFA", image: `${flagBasePath}/Bosnia_y_Herzegovina.svg` },
  { number: 26, slug: "japon", name: "Japon", confederation: "AFC", image: `${flagBasePath}/Japon.svg` },
  { number: 27, slug: "corea-del-sur", name: "Corea del Sur", confederation: "AFC", image: `${flagBasePath}/Corea_del_Sur.svg` },
  { number: 28, slug: "iran", name: "Iran", confederation: "AFC", image: `${flagBasePath}/Iran.svg` },
  { number: 29, slug: "arabia-saudita", name: "Arabia Saudita", confederation: "AFC", image: `${flagBasePath}/Arabia_Saudita.svg` },
  { number: 30, slug: "australia", name: "Australia", confederation: "AFC", image: `${flagBasePath}/Australia.svg` },
  { number: 31, slug: "catar", name: "Catar", confederation: "AFC", image: `${flagBasePath}/Catar.svg` },
  { number: 32, slug: "irak", name: "Irak", confederation: "AFC", image: `${flagBasePath}/Irak.svg` },
  { number: 33, slug: "jordania", name: "Jordania", confederation: "AFC", image: `${flagBasePath}/Jordania.svg`, isDebutant: true },
  { number: 34, slug: "uzbekistan", name: "Uzbekistan", confederation: "AFC", image: `${flagBasePath}/Uzbekistan.svg`, isDebutant: true },
  { number: 35, slug: "marruecos", name: "Marruecos", confederation: "CAF", image: `${flagBasePath}/Marruecos.svg` },
  { number: 36, slug: "egipto", name: "Egipto", confederation: "CAF", image: `${flagBasePath}/Egipto.svg` },
  { number: 37, slug: "argelia", name: "Argelia", confederation: "CAF", image: `${flagBasePath}/Argelia.svg` },
  { number: 38, slug: "tunez", name: "Tunez", confederation: "CAF", image: `${flagBasePath}/Tunez.svg` },
  { number: 39, slug: "ghana", name: "Ghana", confederation: "CAF", image: `${flagBasePath}/Ghana.svg` },
  { number: 40, slug: "senegal", name: "Senegal", confederation: "CAF", image: `${flagBasePath}/Senegal.svg` },
  { number: 41, slug: "costa-de-marfil", name: "Costa de Marfil", confederation: "CAF", image: `${flagBasePath}/Costa_de_Marfil.svg` },
  { number: 42, slug: "sudafrica", name: "Sudafrica", confederation: "CAF", image: `${flagBasePath}/Sudafrica.svg` },
  { number: 43, slug: "rd-congo", name: "RD Congo", confederation: "CAF", image: `${flagBasePath}/RD_Congo.svg` },
  { number: 44, slug: "cabo-verde", name: "Cabo Verde", confederation: "CAF", image: `${flagBasePath}/Cabo_Verde.svg`, isDebutant: true },
  { number: 45, slug: "nueva-zelanda", name: "Nueva Zelanda", confederation: "OFC", image: `${flagBasePath}/Nueva_Zelanda.svg` },
  { number: 46, slug: "panama", name: "Panama", confederation: "CONCACAF", image: `${flagBasePath}/Panama.svg` },
  { number: 47, slug: "haiti", name: "Haiti", confederation: "CONCACAF", image: `${flagBasePath}/Haiti.svg` },
  { number: 48, slug: "curazao", name: "Curazao", confederation: "CONCACAF", image: `${flagBasePath}/Curazao.svg`, isDebutant: true },
].map((card) => ({
  ...card,
  id: card.slug,
}));
