import SeoLandingPage from "@/components/SeoLandingPage";
import { createSeoLandingMetadata, getSeoLandingPage } from "@/lib/seo-landing-pages";

const page = getSeoLandingPage("end-of-year-bingo");

export const metadata = createSeoLandingMetadata(page);

export default function Page() {
  return <SeoLandingPage page={page} />;
}
