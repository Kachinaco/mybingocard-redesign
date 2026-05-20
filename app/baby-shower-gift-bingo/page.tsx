import SeoLandingPage from "@/components/SeoLandingPage";
import { createSeoLandingMetadata, getSeoLandingPage } from "@/lib/seo-landing-pages";

const page = getSeoLandingPage("baby-shower-gift-bingo");

export const metadata = createSeoLandingMetadata(page);

export default function Page() {
  return <SeoLandingPage page={page} />;
}
