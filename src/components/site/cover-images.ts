import type { StaticImageData } from "next/image";
import atkinsSpiraea from "@/assets/images/atkins-spiraea.jpg";
import fernPrint from "@/assets/images/fern-print.jpg";
import rubensForearms from "@/assets/images/rubens-forearms.jpg";

/**
 * The journal's full-bleed images: public-domain works from The Metropolitan
 * Museum of Art's Open Access collection (CC0), cropped to the artwork.
 * Wherever one appears, show its credit too (see <CoverCredit>).
 */
export type Cover = {
  src: StaticImageData;
  alt: string;
  /** As the museum records the maker. */
  maker: string;
  title: string;
  date: string;
  medium: string;
  /** The work's page on metmuseum.org. */
  url: string;
  /** CSS object-position: the part of the image to keep when it is cropped to fit. */
  focus: string;
};

export const COVERS = {
  spiraea: {
    src: atkinsSpiraea,
    alt: "A cyanotype of goat’s beard: leaves and feathery flower plumes printed white on deep blue.",
    maker: "Anna Atkins",
    title: "Spiraea aruncus (Tyrol)",
    date: "1851–54",
    medium: "Cyanotype",
    url: "https://www.metmuseum.org/art/collection/search/285421",
    focus: "50% 32%",
  },
  forearms: {
    src: rubensForearms,
    alt: "Pen and ink studies of the muscles of two forearms and hands.",
    maker: "Peter Paul Rubens",
    title: "Anatomical Studies: a left forearm in two positions and a right forearm",
    date: "ca. 1600–05",
    medium: "Pen and brown ink",
    url: "https://www.metmuseum.org/art/collection/search/342377",
    focus: "55% 50%",
  },
  fern: {
    src: fernPrint,
    alt: "A photographic print of a fern frond, pale against a near-black ground.",
    maker: "Unknown photographer",
    title: "Botanical Specimen: Fern",
    date: "1855–60",
    medium: "Albumen silver print",
    url: "https://www.metmuseum.org/art/collection/search/285149",
    focus: "45% 40%",
  },
} as const satisfies Record<string, Cover>;

export type CoverName = keyof typeof COVERS;
